// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package saxadmin provides a library to interact with sax admin.
package saxadmin

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	log "github.com/golang/glog"
	"google.golang.org/grpc"
	"saxml/common/addr"
	"saxml/common/errors"
	"saxml/common/platform/env"
	"saxml/common/retrier"
	"saxml/common/watchable"

	pb "saxml/protobuf/admin_go_proto_grpc"
	pbgrpc "saxml/protobuf/admin_go_proto_grpc"
)

// RPC timeout, only intended for admin methods. Data methods have no timeout in general.
const timeout = 10 * time.Second

// Create Admin server connection.
func establishAdminConn(address string) (*grpc.ClientConn, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	conn, err := env.Get().DialContext(ctx, address)
	if errors.IsDeadlineExceeded(err) {
		err = fmt.Errorf("Dial to admin failed: %w", errors.ErrUnavailable)
	}
	return conn, err
}

// Admin represents a connection to the admin server.
type Admin struct {
	saxCell string // E.g., /sax/bar

	mu sync.Mutex
	// dialing is true if and only if there is an attempt ongoing to open a
	// network connection to the admin server.
	dialing bool
	// conn is the grpc connection to the admin server. Can be nil if
	// the admin is unreachable.
	conn *grpc.ClientConn
	// client is the admin service client.
	client pbgrpc.AdminClient

	// addrs maintains an addrReplica for every model seen by this
	// admin through FindAdddress(). Each addrReplica is the set of
	// model server addresses for the model. The set is lazily
	// replicated from the admin server through WatchAddresses().
	addrs map[string]*addrReplica
}

// TODO(zhifengc): consider abstracting out module providing a
// resettable sync.Once interface, which can be tested separatedly.
func (a *Admin) getAdminClient(ctx context.Context) (pbgrpc.AdminClient, error) {
	a.mu.Lock()
	// A quick check if a.client is established already.
	if a.client != nil {
		defer a.mu.Unlock()
		return a.client, nil
	}
	// Makes sure there is only one thread attempting to dial to the admin server.
	if a.dialing {
		defer a.mu.Unlock()
		return nil, fmt.Errorf("Dialing to admin: %w", errors.ErrResourceExhausted)
	}
	a.dialing = true
	a.mu.Unlock()

	// Ensures a.dialing is set to false when this function ends.
	defer func() {
		a.mu.Lock()
		defer a.mu.Unlock()
		a.dialing = false
	}()

	addr, err := addr.FetchAddr(ctx, a.saxCell)
	if err != nil {
		return nil, err
	}

	conn, err := establishAdminConn(addr)
	if err != nil {
		return nil, err
	}

	a.mu.Lock()
	defer a.mu.Unlock()
	a.conn, a.client = conn, pbgrpc.NewAdminClient(conn)
	return a.client, nil
}

func (a *Admin) poison() {
	a.mu.Lock()
	conn := a.conn
	a.conn = nil
	a.client = nil
	a.mu.Unlock()

	if conn != nil {
		conn.Close()
	}
}

func (a *Admin) retry(ctx context.Context, callback func(client pbgrpc.AdminClient) error) error {
	action := func() error {
		client, err := a.getAdminClient(ctx)
		if err == nil {
			err = callback(client)
		}
		if errors.AdminShouldPoison(err) {
			a.poison()
		}
		return err
	}
	return retrier.Do(ctx, action, errors.AdminShouldRetry)
}

// Publish publishes a model.
func (a *Admin) Publish(ctx context.Context, modelID, modelPath, checkpointPath string, numReplicas int) error {
	req := &pb.PublishRequest{
		Model: &pb.Model{
			ModelId:              modelID,
			ModelPath:            modelPath,
			CheckpointPath:       checkpointPath,
			RequestedNumReplicas: int32(numReplicas),
		},
	}

	return a.retry(ctx, func(client pbgrpc.AdminClient) error {
		_, err := client.Publish(ctx, req)
		return err
	})
}

// Update updates the model definition of a published model.
func (a *Admin) Update(ctx context.Context, model *pb.Model) error {
	req := &pb.UpdateRequest{Model: model}
	return a.retry(ctx, func(client pbgrpc.AdminClient) error {
		_, err := client.Update(ctx, req)
		return err
	})
}

// Unpublish unpublishes a model.
func (a *Admin) Unpublish(ctx context.Context, modelID string) error {
	req := &pb.UnpublishRequest{
		ModelId: modelID,
	}
	return a.retry(ctx, func(client pbgrpc.AdminClient) error {
		var err error
		_, err = client.Unpublish(ctx, req)
		return err
	})
}

// List lists the status of a published model.
func (a *Admin) List(ctx context.Context, modelID string) (*pb.PublishedModel, error) {
	req := &pb.ListRequest{
		ModelId: modelID,
	}
	var res *pb.ListResponse
	err := a.retry(ctx, func(client pbgrpc.AdminClient) error {
		var err error
		res, err = client.List(ctx, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	if len(res.GetPublishedModels()) != 1 {
		return nil, fmt.Errorf("one model expected for %s but found %d %w", modelID, len(res.GetPublishedModels()), errors.ErrNotFound)
	}
	return res.GetPublishedModels()[0], nil
}

// ListAll lists the status of all published models.
func (a *Admin) ListAll(ctx context.Context) (*pb.ListResponse, error) {
	req := &pb.ListRequest{}
	var res *pb.ListResponse
	err := a.retry(ctx, func(client pbgrpc.AdminClient) error {
		var err error
		res, err = client.List(ctx, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	return res, nil
}

// Stats returns the status of the cell
func (a *Admin) Stats(ctx context.Context, modelID string) (*pb.StatsResponse, error) {
	req := &pb.StatsRequest{
		ModelId: modelID,
	}
	var res *pb.StatsResponse
	err := a.retry(ctx, func(client pbgrpc.AdminClient) error {
		var err error
		res, err = client.Stats(ctx, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	return res, nil
}

// addrReplica maintains a set of server addresses for a model.
type addrReplica struct {
	modelID string
	mu      sync.Mutex
	// addr and index maintain the invariant: addr[index[x]] == x.
	addr  []string
	index map[string]int
}

// Update updates the set of server addresses according to the
// incremental updates sent back from the admin server through
// chanWatchResult.
func (a *addrReplica) Update(chanWatchResult chan *WatchResult) error {
	for wr := range chanWatchResult {
		log.Infof("addrReplica.Update(%s) %v", a.modelID, wr)
		if wr.Err != nil {
			return wr.Err
		}
		a.mu.Lock()
		if wr.Result.Data != nil {
			// After a long network partition or the first time using
			// the model, the client may get a full set from the admin
			// server. It should happen rarely.
			log.Infof("Receive a full set for %s: %v", a.modelID, wr)
			a.addr = wr.Result.Data.ToList()
			a.index = make(map[string]int)
			for i, addr := range a.addr {
				a.index[addr] = i
			}
		}
		for _, m := range wr.Result.Log {
			switch m.Kind {
			case watchable.Add:
				a.index[m.Val] = len(a.addr)
				a.addr = append(a.addr, m.Val)
			case watchable.Del:
				if i, ok := a.index[m.Val]; ok {
					n := len(a.addr)
					a.addr[i] = a.addr[n-1]
					a.index[a.addr[i]] = i
					a.addr = a.addr[:n-1]
					delete(a.index, m.Val)
				}
			default:
				log.Warningf("Unexpected Kind: %v", m.Kind)
			}
		}
		a.mu.Unlock()
	}
	return nil
}

// Pick randomly picks up to `ask` addresses with replacements.
func (a *addrReplica) Pick(ask int) []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	n := len(a.addr)
	if n == 0 {
		return nil
	}
	if ask >= n {
		ret := make([]string, n)
		copy(ret, a.addr)
		return ret
	}
	// NOTE: It's ok to return duplicated entries because the caller
	// of FindAdddress() in location.go deduplicates them.
	ret := make([]string, ask)
	for i := 0; i < ask; i++ {
		ret[i] = a.addr[rand.Intn(n)]
	}
	return ret
}

// FindAdddress queries the local replica of the server address set to
// get up to `ask` modelet servers addresses.
func (a *Admin) FindAddresses(ctx context.Context, model string, ask int) ([]string, error) {
	a.mu.Lock()
	ar, ok := a.addrs[model]
	if !ok {
		// First time to access the model, setup the addrReplica and
		// arrange a background go routine to keep it updated.
		ar = &addrReplica{modelID: model, index: make(map[string]int)}
		chanWatchResult := make(chan *WatchResult)
		go a.WatchAddresses(context.Background(), model, chanWatchResult)
		go func() {
			err := ar.Update(chanWatchResult)
			if err == nil {
				log.Infof("addrReplica.Update for %s exit", model)
				return
			}
			// If there is an error (e.g., the model is unpublished),
			// we should remove its local s.addrs.
			log.Errorf("addrReplica.Update for %s got error %v", model, err)
			a.mu.Lock()
			defer a.mu.Unlock()
			delete(a.addrs, model)
		}()
		a.addrs[model] = ar
	}
	a.mu.Unlock()

	return ar.Pick(ask), nil
}

// WatchResult encapsulates the changes to the server addresses for a
// model.
type WatchResult struct {
	// Err is the error returned by the WatchAddresses().
	Err error
	// Result represents the changes to the server addresses if Err is nil.
	Result *watchable.WatchResult
}

// WatchAddresses replicates the changes to the model's server addresses.
//
// The caller of WatchAddresses() receives all the changes though the
// chanWatchResult.  WatchAddresses intentionally never stops until
// the model is unpublished.
func (a *Admin) WatchAddresses(ctx context.Context, model string, chanWatchResult chan *WatchResult) {
	var serverID string
	var seqno int32
	for {
		req := &pb.WatchLocRequest{
			ModelId:       model,
			AdminServerId: serverID,
			Seqno:         seqno,
		}
		var resp *pb.WatchLocResponse
		err := a.retry(ctx, func(client pbgrpc.AdminClient) error {
			var err error
			resp, err = client.WatchLoc(ctx, req)
			return err
		})
		if err != nil {
			chanWatchResult <- &WatchResult{Err: err}
			if errors.IsNotFound(err) {
				return
			}
			// For other errors, we reset the process.
			log.Errorf("Unexpected WatchLoc rpc call error: %v", err)
			serverID, seqno = "", 0
			time.Sleep(time.Second)
			continue
		}
		serverID = resp.GetAdminServerId()
		w := watchable.FromProto(resp.GetResult())
		chanWatchResult <- &WatchResult{Result: w}
		seqno = w.Next
	}
}

type openedAdmin struct {
	mu     sync.Mutex
	admins map[string]*Admin
}

func (o *openedAdmin) Get(saxCell string) *Admin {
	o.mu.Lock()
	defer o.mu.Unlock()
	if found, ok := o.admins[saxCell]; ok {
		return found
	}
	ret := &Admin{
		saxCell: saxCell,
		addrs:   make(map[string]*addrReplica),
	}
	o.admins[saxCell] = ret
	return ret
}

var adminCache *openedAdmin = &openedAdmin{admins: make(map[string]*Admin)}

// Open returns an admin interface for users to query system state, such as listing all models.
func Open(saxCell string) *Admin {
	return adminCache.Get(saxCell)
}
