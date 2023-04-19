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

"""Exposes the public layer functionalities."""

from praxis.layers.quantization.attentions import AttentionProjection
from praxis.layers.quantization.attentions import CombinedQKVProjectionLayer
from praxis.layers.quantization.attentions import DotProductAttention
from praxis.layers.quantization.conformers import DotProductAttentionWithContext
from praxis.layers.quantization.embedding_softmax import Embedding
from praxis.layers.quantization.embedding_softmax import NClassMajorSharedEmbeddingSoftmax
from praxis.layers.quantization.embedding_softmax import SharedEmbeddingSoftmax
from praxis.layers.quantization.linears import Linear
from praxis.layers.quantization.multi_query_attention import OneHeadedAttentionProjection
from praxis.layers.quantization.ngrammer import Ngrammer
from praxis.layers.quantization.ngrammer import VQNgrammer
from praxis.layers.quantization.operations import einsum
from praxis.layers.quantization.searchable import SearchableAttentionProjection
from praxis.layers.quantization.searchable import SearchableCombinedQKVProjectionLayer
from praxis.layers.quantization.searchable import SearchableLinear
