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

"""Tests for Python utils."""

import collections
import re
import time
from typing import Any, List

from absl.testing import absltest
from absl.testing import parameterized
import flax
from flax import struct
import jax
from jax import numpy as jnp
import numpy as np
from praxis import base_layer
from praxis import py_utils
from praxis import test_utils


class TrainState(struct.PyTreeNode):
  """Simple train state."""

  step: base_layer.JTensorOrPartitionSpec
  mdl_vars: base_layer.NestedJTensorOrPartitionSpec
  opt_states: List[base_layer.NestedJTensorOrPartitionSpec]


class PyUtilsTest(test_utils.TestCase):

  def test_reshard_empty_array(self):
    batch_size = 128
    empty_inputs = np.ones(shape=(batch_size, 0))
    sharded_inputs = py_utils.reshard(empty_inputs)
    # Check the shape of returned inputs.
    num_devices = jax.local_device_count()
    self.assertEqual(sharded_inputs.shape,
                     (num_devices, batch_size // num_devices, 0))

  def test_extract_prefixed_keys_from_state_specs(self):
    w_sepc = base_layer.var_partition_specs(
        {'w': base_layer.WeightHParams(shape=(4, 8))},
        mesh_shape=[1, 1],
        device_axis_names=['a', 'b'])
    train_state_partition_specs = TrainState(
        step=jax.sharding.PartitionSpec(), mdl_vars=w_sepc, opt_states=[]
    )
    nested_names = py_utils.extract_prefixed_keys_from_nested_map(
        train_state_partition_specs)
    flattened_names, _ = jax.tree_util.tree_flatten(nested_names)
    self.assertListEqual(['step', 'mdl_vars/w'], flattened_names)

  def test_extract_prefixed_keys_from_nested_map(self):
    Point = collections.namedtuple('Point', ['x', 'y'])

    inputs = {'a': [1, 2, Point(x=3, y=4), (5, 6)], 'b': ('c', 'd')}
    outputs = py_utils.extract_prefixed_keys_from_nested_map(inputs)
    self.assertEqual(
        {
            'a': [
                'a[0]', 'a[1]',
                Point(x='a[2]/x', y='a[2]/y'), ('a[3][0]', 'a[3][1]')
            ],
            'b': ('b[0]', 'b[1]')
        }, outputs)

  def test_extract_prefixed_keys_from_dataclass(self):

    @struct.dataclass
    class GlobalShardedParameterStats:
      statistics: np.ndarray  # Statistics
      preconditioners: np.ndarray  # Preconditioners
      exponents: np.ndarray  # exponents
      index_start: int = struct.field(pytree_node=False)
      sizes: Any = struct.field(pytree_node=False)

    stats0 = GlobalShardedParameterStats(
        statistics=np.array([0], dtype=np.float32),
        preconditioners=np.array([1, 1], dtype=np.float32),
        exponents=np.array([2, 2, 2], dtype=np.float32),
        index_start=0,
        sizes=0,
    )
    # Even though the `preconditioners` is first here, the order is decided
    # by the order in `GlobalShardedParameterStats` class.
    stats1 = GlobalShardedParameterStats(
        preconditioners=np.array([5, 5], dtype=np.float32),
        statistics=np.array([4], dtype=np.float32),
        exponents=np.array([6, 6, 6], dtype=np.float32),
        index_start=1,
        sizes=1,
    )

    nested_data = py_utils.NestedMap(stats0=stats0, stats1=stats1)
    nested_names = py_utils.extract_prefixed_keys_from_nested_map(nested_data)
    flattened_nested_names, _ = jax.tree_util.tree_flatten(nested_names)

    self.assertListEqual([
        'stats0/statistics', 'stats0/preconditioners', 'stats0/exponents',
        'stats1/statistics', 'stats1/preconditioners', 'stats1/exponents'
    ], flattened_nested_names)

  def test_extract_prefixed_keys_using_is_leaf(self):

    class Masked:
      """Test class."""

    Point = collections.namedtuple('Point', ['x', 'y'])

    inputs = {
        'a': [1, 2, Point(x=3, y=4), (5, 6, Masked())],
        'b': ('c', 'd'),
        'e': Masked()
    }
    outputs = py_utils.extract_prefixed_keys_from_nested_map(
        inputs, is_leaf=lambda x: isinstance(x, Masked))
    self.assertEqual(
        {
            'a': [
                'a[0]', 'a[1]',
                Point(x='a[2]/x', y='a[2]/y'), ('a[3][0]', 'a[3][1]', None)
            ],
            'b': ('b[0]', 'b[1]'),
            'e': None,
        }, outputs)

  def test_sync_global_devices(self):
    py_utils.sync_global_devices('sync')

  def test_select_nodes_by_indices(self):
    result = py_utils.select_nodes_by_indices(
        (0, 1, 2), ('a', 'b', 'c'), ('A', 'B', 'C'), ('alpha', 'beta', 'gamma'))
    self.assertEqual(result, ('a', 'B', 'gamma'))

  def test_match_variable_names(self):
    tree = py_utils.NestedMap(
        a=py_utils.NestedMap(x=0, y=1, zz=2),
        b=py_utils.NestedMap(z=1),
    )
    expected = py_utils.NestedMap(
        a=py_utils.NestedMap(x=True, y=True, zz=False),
        b=py_utils.NestedMap(z=False),
    )
    result = py_utils.match_variable_names(tree, r'a/.')
    self.assertEqual(result, expected)
    expected.a.zz = True
    result = py_utils.match_variable_names(tree, [r'a/.', re.compile('.*zz')])
    self.assertEqual(result, expected)

  def test_update_matched_variables(self):
    old_tree = py_utils.NestedMap(
        a=py_utils.NestedMap(x=0, y=0, zz=0),
        b=py_utils.NestedMap(z=0),
    )
    new_tree = jax.tree_map(lambda x: x + 1, old_tree)
    result = py_utils.update_matched_variables(old_tree, new_tree,
                                               re.compile('.*z'))
    expected = py_utils.NestedMap(
        a=py_utils.NestedMap(x=0, y=0, zz=1),
        b=py_utils.NestedMap(z=1),
    )
    self.assertEqual(result, expected)
    result = py_utils.update_matched_variables(
        old_tree, new_tree, re.compile('.*z'), invert=True)
    expected_inv = py_utils.NestedMap(
        a=py_utils.NestedMap(x=1, y=1, zz=0),
        b=py_utils.NestedMap(z=0),
    )
    self.assertEqual(result, expected_inv)

  @parameterized.parameters(jnp.int32, jnp.float32, jnp.int64, jnp.float64)
  def test_get_large_negative_number(self, dtype):
    jax_number = py_utils.get_large_negative_number(dtype)
    self.assertDtypesMatch(jax_number, dtype)

  @parameterized.parameters(jnp.int32, jnp.float32, jnp.bool_)
  def test_sequence_mask(self, dtype):
    lengths = np.array([0, 1, 2, 3])
    mask = py_utils.sequence_mask(lengths, maxlen=4, dtype=dtype)
    expected = np.tri(4, k=-1, dtype=dtype)
    self.assertAllClose(mask, expected)

  @parameterized.parameters(jnp.int32, jnp.float32, jnp.bool_)
  def test_sequence_paddings(self, dtype):
    lengths = np.array([0, 1, 2, 3])
    paddings = py_utils.sequence_paddings(lengths, maxlen=4, dtype=dtype)
    expected = (1 - np.tri(4, k=-1)).astype(dtype)
    self.assertAllClose(paddings, expected)

  def test_sequence_paddings_from_python_list(self):
    lengths = [0, 1, 2, 3]
    paddings = py_utils.sequence_paddings(lengths, maxlen=4)
    expected = (1 - np.tri(4, k=-1))
    self.assertAllClose(paddings, expected)

  @parameterized.named_parameters(
      ('_numpy', np),
      ('_jax_numpy', jnp),
  )
  def test_tree_unstack(self, np_module):
    batch_axis, batch_size = 0, 8
    tree = py_utils.NestedMap(
        a=np_module.reshape(np_module.arange(batch_size), (batch_size, 1)),
        b=py_utils.NestedMap(
            c=np_module.reshape(
                np_module.arange(batch_size * 2 * 3), (batch_size, 2, 3)),),
    )

    flat_trees = py_utils.tree_unstack(tree, batch_axis)
    self.assertLen(flat_trees, batch_size)

    # Merge tree back
    merged_tree = jax.tree_map(lambda x: np_module.expand_dims(x, batch_axis),
                               flat_trees[0])

    def _concat_tree_with_batch(x_batch, y):
      y_batch = np_module.expand_dims(y, batch_axis)
      return np_module.concatenate((x_batch, y_batch), axis=batch_axis)

    for other_tree in flat_trees[1:]:
      merged_tree = jax.tree_map(_concat_tree_with_batch, merged_tree,
                                 other_tree)

    # Check all leaves are element-wise equal
    for l1, l2 in zip(
        jax.tree_util.tree_leaves(tree),
        jax.tree_util.tree_leaves(merged_tree)):
      self.assertArraysEqual(l1, l2)

  def test_apply_padding_zero(self):
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.array([[0.0], [1.0], [0.0]]))
    self.assertAllClose(y, [[1.0, 2.0], [0.0, 0.0], [5.0, 6.0]])

  def test_apply_padding_constant(self):
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.array([[0.0], [1.0], [0.0]]),
        pad_value=np.array([[1.0, 2.0], [9.0, 10.0], [5.0, 6.0]]))
    self.assertAllClose(y, [[1.0, 2.0], [9.0, 10.0], [5.0, 6.0]])

  def test_apply_padding_zero_arithmetic(self):
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.array([[0.0], [1.0], [0.0]]),
        use_select=False)
    self.assertAllClose(y, [[1.0, 2.0], [0.0, 0.0], [5.0, 6.0]])

  def test_apply_padding_with_axis_0(self):
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.array([[0.0], [1.0], [0.0]]),
        axis=0)
    self.assertAllClose(y, [[1.0, 2.0], [0.0, 0.0], [5.0, 6.0]])

  def test_apply_padding_with_axis_0_and_one_more_dim(self):
    # inputs=[3, 2] and paddings=[3, 2, 1]
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.expand_dims(
            np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]), -1),
        axis=0)
    self.assertAllClose(y, [[1.0, 2.0], [0.0, 4.0], [5.0, 0.0]])

  def test_pad_inputs_with_axis_0_and_one_less_dim(self):
    # inputs=[1, 2, 3] and paddings=[1, 2]
    y = py_utils.apply_padding(
        inputs=np.array([[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]]),
        padding=np.array([[1.0, 0.0]]),
        axis=0)
    self.assertAllClose(y, [[[0.0, 0.0, 0.0], [4.0, 5.0, 6.0]]])

  def test_apply_padding_with_axis_1_and_one_more_dim(self):
    # inputs=[3, 2] and paddings=[3, 2, 1]
    y = py_utils.apply_padding(
        inputs=np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]),
        padding=np.expand_dims(
            np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]), -1),
        axis=1)
    self.assertAllClose(y, [[1.0, 2.0], [0.0, 4.0], [5.0, 0.0]])

  def test_pad_inputs_with_axis_1_and_same_rank(self):
    # inputs=[5, 1, 2, 3] and paddings=[1, 2, 1]
    batch = 5
    y = py_utils.apply_padding(
        inputs=np.array([[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]] * batch),
        padding=np.expand_dims(np.array([[1.0, 0.0]]), -1),
        axis=1)
    self.assertAllClose(y, [[[0.0, 0.0, 0.0], [4.0, 5.0, 6.0]]] * batch)

  def test_pad_inputs_with_axis_1_and_one_less_dim(self):
    # inputs=[5, 1, 2, 3] and paddings=[1, 2]
    batch = 5
    y = py_utils.apply_padding(
        inputs=np.array([[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]] * batch),
        padding=np.array([[1.0, 0.0]]),
        axis=1)
    self.assertAllClose(y, [[[0.0, 0.0, 0.0], [4.0, 5.0, 6.0]]] * batch)

  def test_timeit(self):
    start_time = time.time()
    with py_utils.timeit() as period:
      time.sleep(1)
    end_time = time.time()
    self.assertGreaterEqual(period.start, start_time)
    self.assertLessEqual(period.end, end_time)
    self.assertGreater(period.elapsed, 0.9)

    with py_utils.timeit(min_elapsed=1.) as period:
      _ = 0
    self.assertEqual(period.elapsed, 1.)

  def test_nestedmap_serialization(self):
    # Note that NestedMap keys cannot start with a number.
    # See lingvo/core/nested_map.py for details.
    p1 = py_utils.NestedMap(
        x=[1, {
            2: '3'
        }], y=(4, '5'), z=py_utils.NestedMap(a='6'))
    p2 = py_utils.NestedMap(
        x=[0, {
            2: '0'
        }], y=(0, '0'), z=py_utils.NestedMap(a='0'))
    state_dict = flax.serialization.to_state_dict(p1)
    self.assertEqual(state_dict, {
        'x': {
            '0': 1,
            '1': {
                '2': '3'
            }
        },
        'y': {
            '0': 4,
            '1': '5'
        },
        'z': {
            'a': '6'
        }
    })
    restored_p1 = flax.serialization.from_state_dict(p2, state_dict)
    self.assertEqual(restored_p1, p1)

  @parameterized.named_parameters(
      ('_pad0', 0),
      ('_pad1', 1),
  )
  def test_pad_or_trim_to(self, pad_val):
    key = jax.random.PRNGKey(seed=123456)
    x = jax.random.normal(key, shape=(3, 3))
    shape = [4, 6]
    padded_x = py_utils.pad_or_trim_to(x, shape, pad_val=pad_val)
    self.assertEqual(padded_x.shape, (4, 6))
    self.assertAllClose(x, padded_x[:3, :3])
    sum_diff = jnp.sum(padded_x) - jnp.sum(x)
    self.assertAllClose(sum_diff, pad_val * 15.0)

  @parameterized.named_parameters(
      dict(testcase_name='_dim1', dst=(2, 2)),
      dict(testcase_name='_dim0', dst=(1, 3)),
      dict(testcase_name='_dim01', dst=(1, 2)))
  def test_pad_or_trim_to_trim(self, dst):
    src = (2, 3)
    x = np.random.uniform(0, 1, src).astype(np.float32)
    y = py_utils.pad_or_trim_to(x, dst)
    self.assertSequenceEqual(y.shape, dst)
    self.assertAllClose(y, x[: dst[0], : dst[1]])

  @parameterized.named_parameters(
      dict(testcase_name='_dim1', dst=(2, 4)),
      dict(testcase_name='_dim0', dst=(3, 3)),
      dict(testcase_name='_dim01', dst=(3, 4)))
  def test_pad_or_trim_to(self, dst):
    src = (2, 3)
    pad_value = 42.0
    x = np.random.uniform(0, 1, src).astype(np.float32)
    y = py_utils.pad_or_trim_to(x, dst, pad_value)
    self.assertSequenceEqual(y.shape, dst)
    self.assertAllClose(y[: src[0], : src[1]], x)
    self.assertAllClose(y[src[0] :], pad_value)
    self.assertAllClose(y[:, src[1] :], pad_value)

  @parameterized.named_parameters(
      dict(testcase_name='_pad0_trim1', src=(2, 3), dst=(3, 2)),
      dict(testcase_name='_pad1_trim0', src=(3, 2), dst=(2, 3)),
  )
  def test_pad_or_trim_to_mix(self, src, dst):
    pad_value = 42.0
    x = np.random.uniform(0, 1, src).astype(np.float32)
    y = py_utils.pad_or_trim_to(x, dst, pad_value)
    self.assertSequenceEqual(y.shape, dst)
    self.assertAllClose(y[:2, :2], x[:2, :2])
    self.assertAllClose(y[2:], pad_value)
    self.assertAllClose(y[:, 2:], pad_value)

  @parameterized.named_parameters(('truncate', False), ('extend', True))
  def test_append_eos(self, extend_if_overflow):
    x = jnp.array(
        [[0, 0, 1, 2], [1, 2, 3, 0], [2, 3, 4, 0], [2, 3, 4, 5], [2, 3, 4, 5]],
        jnp.int32,
    )
    paddings = jnp.array(
        [[1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 1, 1], [0, 0, 0, 0]],
        jnp.float32,
    )
    expected_output = jnp.array(
        [[4, 4, 4, 4], [1, 2, 3, 4], [2, 3, 4, 4], [2, 3, 4, 4], [2, 3, 4, 5]],
        jnp.int32,
    )
    expected_paddings = jnp.array(
        [[0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 0]],
        jnp.float32,
    )
    eos_id = 4
    if extend_if_overflow:
      expected_output = jnp.concatenate(
          [expected_output, jnp.ones([5, 1], jnp.int32) * eos_id], 1
      )
      expected_paddings = jnp.concatenate(
          [
              expected_paddings,
              jnp.array([[1], [1], [1], [1], [0]], jnp.float32),
          ],
          1,
      )

    output_x, output_paddings = py_utils.append_eos(
        x, paddings, eos_id, extend_if_overflow
    )
    self.assertArraysEqual(output_x, expected_output)
    self.assertArraysEqual(output_paddings, expected_paddings)

  def test_concat_sequences_with_padding(self):
    input0 = jnp.array([[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]]).reshape(
        [2, 6, 1]
    )
    input1 = jnp.array([[6, 5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6]]).reshape(
        [2, 6, 1]
    )
    paddings0 = jnp.array([[1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]])
    paddings1 = jnp.array([[0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1]])

    expected_output = jnp.array([
        [6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
        [6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    ]).reshape([2, 12, 1])
    output = py_utils.concat_sequences_with_padding(
        input0, paddings0, input1, paddings1
    )
    output = output[0] * jnp.expand_dims(1 - output[1], -1)
    self.assertAllClose(output, expected_output)

    input0 = jnp.array([[1, 2, 0, 0, 0, 0], [6, 5, 4, 3, 2, 1]]).reshape(
        [2, 6, 1]
    )
    input1 = jnp.array([[6, 5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6]]).reshape(
        [2, 6, 1]
    )
    paddings0 = jnp.array([[0, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]])
    paddings1 = jnp.array([[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]])

    expected_output = jnp.array([
        [1, 2, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0],
        [6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6],
    ]).reshape([2, 12, 1])
    output = py_utils.concat_sequences_with_padding(
        input0, paddings0, input1, paddings1
    )
    output = output[0] * jnp.expand_dims(1 - output[1], -1)
    self.assertAllClose(output, expected_output)


if __name__ == '__main__':
  absltest.main()
