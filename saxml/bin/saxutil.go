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

// saxutil is a command-line tool to manage a SAX system (see go/g3doc-sax for help).
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/google/subcommands"
	"saxml/bin/saxcommand"
	"saxml/common/platform/env"
	_ "saxml/common/platform/register" // registers a platform
)

const (
	port = 8080
)

func main() {
	subcommands.Register(subcommands.HelpCommand(), "")
	subcommands.Register(subcommands.FlagsCommand(), "")
	subcommands.Register(subcommands.CommandsCommand(), "")

	// admin commands.
	subcommands.Register(&saxcommand.CreateCmd{}, "")
	subcommands.Register(&saxcommand.ListCmd{}, "")
	subcommands.Register(&saxcommand.PublishCmd{}, "")
	subcommands.Register(&saxcommand.UpdateCmd{}, "")
	subcommands.Register(&saxcommand.GetACLCmd{}, "")
	subcommands.Register(&saxcommand.SetACLCmd{}, "")
	subcommands.Register(&saxcommand.UnpublishCmd{}, "")
	subcommands.Register(&saxcommand.WatchCmd{}, "")

	// export commands.
	subcommands.Register(&saxcommand.ExportCmd{}, "")

	// save commands.
	subcommands.Register(&saxcommand.SaveCmd{}, "")

	// model commands.
	subcommands.Register(&saxcommand.ClassifyCmd{}, "")
	subcommands.Register(&saxcommand.DetectCmd{}, "")
	subcommands.Register(&saxcommand.EmbedImageCmd{}, "")
	subcommands.Register(&saxcommand.EmbedTextCmd{}, "")
	subcommands.Register(&saxcommand.GenerateCmd{}, "")
	subcommands.Register(&saxcommand.RecognizeCmd{}, "")
	subcommands.Register(&saxcommand.ScoreCmd{}, "")
	subcommands.Register(&saxcommand.TextToImageCmd{}, "")

	ctx := context.Background()
	env.Get().Init(ctx)

	go http.ListenAndServe(fmt.Sprintf(":%d", port), nil) // to get /rpcz, etc. for debugging RPCs
	os.Exit(int(subcommands.Execute(ctx)))
}
