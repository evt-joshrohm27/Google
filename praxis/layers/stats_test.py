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

"""Tests for Praxis attention layers."""

from absl.testing import absltest
from jax import numpy as jnp
import numpy as np
from praxis import test_utils
from praxis.layers import stats


class StatsTest(test_utils.TestCase):

  def setUp(self):
    super().setUp()
    np.random.seed(12345687)

  def test_compute_stats(self):
    inputs = jnp.array([[0., 1., 2.], [3., 4., 5.]])
    padding = jnp.array([[0., 0., 0.], [0., 0., 1.]])
    inputs_stats = stats.compute_stats(inputs, padding)
    self.assertAllClose(
        [2., 1.414214, 4.],
        [inputs_stats.mean_v, inputs_stats.std_v, inputs_stats.max_v])


if __name__ == '__main__':
  absltest.main()
