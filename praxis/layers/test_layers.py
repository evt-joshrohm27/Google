# coding=utf-8
# Copyright 2022 The Pax Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""A few utility layers to facilitate writing unit-tests."""

from typing import Tuple

from jax import numpy as jnp
from praxis import base_layer
from praxis import base_model
from praxis import pax_fiddle
from praxis import py_utils
from praxis import pytypes
from praxis.layers import linears
from praxis.layers import normalizations
from praxis.layers import transformers

NestedMap = py_utils.NestedMap
JTensor = pytypes.JTensor
LayerTpl = pax_fiddle.Config[base_layer.BaseLayer]
sub_config_field = base_layer.sub_config_field
template_field = base_layer.template_field


class ProjectionLayer(base_layer.BaseLayer):
  """A simple projection layer.

  Attributes:
    input_dims: Depth of the input.
    output_dims: Depth of the output.
  """
  input_dims: int = 0
  output_dims: int = 0

  def setup(self) -> None:
    linear_layer_p = pax_fiddle.Config(
        linears.Linear, input_dims=self.input_dims, output_dims=self.output_dims
    )
    self.create_child('linear', linear_layer_p)
    bias_layer_p = pax_fiddle.Config(linears.Bias, dims=self.output_dims)
    self.create_child('bias', bias_layer_p)

  def __call__(self, inputs: JTensor) -> JTensor:
    return self.bias(self.linear(inputs))


class AddOneLayer(base_layer.BaseLayer):
  """A layers without any variables."""

  def __call__(self, inputs: JTensor) -> JTensor:
    return inputs + 1.0


class TestLayer(base_layer.BaseLayer):
  """A test layer which is a composite of multiple layers."""

  def setup(self) -> None:
    linear_layer_p01 = pax_fiddle.Config(
        linears.Linear, input_dims=2, output_dims=3
    )
    linear_layer_p02 = pax_fiddle.Config(
        linears.Linear, input_dims=3, output_dims=4
    )
    self.create_children('linear', [linear_layer_p01, linear_layer_p02])
    bias_layer_p01 = pax_fiddle.Config(linears.Bias, dims=3)
    bias_layer_p02 = pax_fiddle.Config(linears.Bias, dims=4)
    self.create_children('bias', [bias_layer_p01, bias_layer_p02])
    add_one_layer_p = pax_fiddle.Config(AddOneLayer)
    self.create_child('add_one', add_one_layer_p)

    self.create_variable('final_proj', base_layer.WeightHParams(shape=[4, 5]))

  def __call__(self, inputs: JTensor) -> JTensor:
    x1 = self.linear[0](inputs)
    x2 = self.bias[0](x1)
    x3 = self.linear[1](x2)
    x4 = self.bias[1](x3)
    x5 = linears.project_last_dim(x4, self.theta.final_proj)
    x6 = self.add_one(x5)
    return x6


class VarUnusedLayer(base_layer.BaseLayer):
  """A test where some of the vars are not used in fprop.

  Attributes:
    input_dims: Depth of the input.
    output_dims: Depth of the output.
  """
  input_dims: int = 0
  output_dims: int = 0

  def setup(self) -> None:
    self.create_variable(
        'var01',
        base_layer.WeightHParams(shape=[self.input_dims, self.output_dims]),
    )
    # var02 is not used.
    self.create_variable(
        'var02',
        base_layer.WeightHParams(shape=[self.input_dims, self.output_dims]),
    )

  def __call__(self, inputs: JTensor) -> JTensor:
    out = jnp.einsum('bi,io->bo', inputs, self.theta.var01)
    loss = jnp.sum(out)
    return loss


class TestModel01(base_model.BaseModel):
  """Simple model for testing.

  Attributes:
    input_dims: Depth of the input.
    output_dims: Depth of the output.
  """
  input_dims: int = 0
  output_dims: int = 0

  def setup(self) -> None:
    bn_params = pax_fiddle.Config(
        normalizations.BatchNorm, name='bn', dim=self.input_dims
    )
    self.create_child('bn', bn_params)

    self.create_variable(
        'var01',
        base_layer.WeightHParams(shape=[self.input_dims, self.output_dims]),
    )
    # var02 is not used.
    self.create_variable(
        'var02',
        base_layer.WeightHParams(shape=[self.input_dims, self.output_dims]),
    )

  def compute_predictions(self, input_batch: NestedMap) -> JTensor:
    in_normed = self.bn(input_batch.inputs)
    return jnp.einsum('bi,io->bo', in_normed, self.theta.var01)

  def compute_loss(self, predictions: JTensor,  # pytype: disable=signature-mismatch  # jax-ndarray
                   input_batch: NestedMap) -> Tuple[NestedMap, NestedMap]:
    del input_batch
    loss = jnp.sum(predictions)
    loss02 = jnp.sum(predictions * predictions)
    # Here loss is the main loss to back-prop into, and loss02 is an eval
    # metric.
    per_example_out = NestedMap()
    return NestedMap(
        loss=(loss, jnp.array(1.0, loss.dtype)),
        loss02=(loss02, jnp.array(1.0, loss02.dtype))), per_example_out


class TestLinearRegressionModel(base_model.BaseModel):
  """Linear regression model.

  Attributes:
    input_dims: Depth of the input.
    output_dims: Depth of the output.
    linear_p: Params for the linear layer.
  """
  input_dims: int = 0
  output_dims: int = 0
  linear_p: LayerTpl = template_field(linears.Linear)

  def setup(self) -> None:
    params = self.linear_p.clone()
    params.input_dims = self.input_dims
    params.output_dims = self.output_dims
    self.create_child('linear', params)

  def compute_predictions(self, input_batch: NestedMap) -> JTensor:
    return self.linear(input_batch.inputs)

  def compute_loss(self, predictions, input_batch):
    targets = input_batch.targets
    error = predictions - targets
    loss = jnp.mean(jnp.square(error))
    per_example_out = NestedMap(predictions=predictions)
    return NestedMap(loss=(loss, jnp.array(1.0, loss.dtype))), per_example_out


class TestBatchNormalizationModel(base_model.BaseModel):
  """Test batch normalization correctness using a regression task.

  Attributes:
    input_dims: Depth of the input.
  """
  input_dims: int = 0

  def setup(self):
    bn_params = pax_fiddle.Config(
        normalizations.BatchNorm, name='bn', dim=self.input_dims
    )
    self.create_child('bn', bn_params)

  def compute_predictions(self, input_batch: NestedMap) -> JTensor:
    params = base_layer.cur_jax_context().hparams.clone()
    params.summary_verbosity = 4  # Enable BN summaries for testing.
    with base_layer.JaxContext.new_context(hparams=params):
      return self.bn(input_batch.inputs)

  def compute_loss(self, predictions: JTensor,  # pytype: disable=signature-mismatch  # jax-ndarray
                   input_batch: NestedMap) -> Tuple[NestedMap, NestedMap]:
    targets = input_batch.targets
    error = predictions - targets
    loss = jnp.mean(jnp.square(error))
    per_example_out = NestedMap(predictions=predictions)
    return NestedMap(loss=(loss, jnp.array(1.0, loss.dtype))), per_example_out


class TestSpmdModel(base_model.BaseModel):
  """A simple spmd model for testing purposes.

  Attributes:
    xformer_ffw: Parameterization of the feedforward layer.
  """
  xformer_ffw: LayerTpl = template_field(transformers.TransformerFeedForward)

  def setup(self):
    self.create_child('ffwd', self.xformer_ffw)

  def compute_predictions(self, input_batch: NestedMap) -> JTensor:
    return self.ffwd(input_batch.inputs)

  def compute_loss(self, predictions: JTensor,  # pytype: disable=signature-mismatch  # jax-ndarray
                   input_batch: NestedMap) -> Tuple[NestedMap, NestedMap]:
    loss = jnp.mean(jnp.square(predictions))
    per_example_out = NestedMap(predictions=predictions)
    return NestedMap(loss=(loss, jnp.array(1.0, loss.dtype))), per_example_out
