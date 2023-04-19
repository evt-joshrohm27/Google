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

"""Tests for base_hyperparams."""

import dataclasses
import functools
import inspect
import pickle
import textwrap
from typing import Any, Dict, List, NamedTuple, Optional, Tuple

from absl.testing import absltest
import fiddle as fdl
from fiddle.experimental import serialization as fdl_serialization
from flax.core import frozen_dict
from jax import numpy as jnp
# Internal config_dict import from ml_collections
import numpy as np
from praxis import base_hyperparams
from praxis import base_layer
from praxis import pax_fiddle
import tensorflow.compat.v2 as tf

nested_struct_to_text = base_hyperparams.nested_struct_to_text


class SimpleTestClass(base_hyperparams.BaseParameterizable):

  _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

  class HParams(base_hyperparams.BaseHyperParams):
    a: int
    b: str = 'b'


class SimpleTestChild(SimpleTestClass):

  class HParams(SimpleTestClass.HParams):
    c: float = 2.0

  params: base_hyperparams.BaseHyperParams
  child: SimpleTestClass

  def __init__(self, hparams: base_hyperparams.BaseHyperParams,
               child: SimpleTestClass):
    super().__init__(hparams)
    self.child = child


class NestedTestClass(base_hyperparams.BaseParameterizable):

  _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

  class HParams(base_hyperparams.BaseHyperParams):
    # Note: This is now no longer recommended; only Params should be fields of
    # Params.
    d: Optional[SimpleTestChild] = None
    e: float = 3.0


class NestedTestBehaveClass(NestedTestClass):
  # It has the same parameters with NestedTestClass,
  # but it can have different behavior.
  pass


class NestedNestedTestClass(base_hyperparams.BaseParameterizable):

  _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

  class HParams(base_hyperparams.BaseHyperParams):
    tpl: NestedTestClass.HParams


class NestedNestedOverrideTestClass(NestedNestedTestClass):
  class HParams(NestedNestedTestClass.HParams):
    _attribute_overrides: Tuple[str, ...] = ('tpl',)
    tpl: base_hyperparams.HParams = base_hyperparams.sub_config_field(
        NestedTestBehaveClass.HParams)


class FiddleTestClass(base_hyperparams.BaseParameterizable):

  _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

  class HParams(base_hyperparams.BaseHyperParams):
    f: fdl.Config = None
    g: fdl.Config = None
    h: float = 3.0

  params: base_hyperparams.BaseHyperParams


def sample_fn(x, y=5):
  return (x, y)


class FiddleToTextTestClass(base_layer.BaseLayer):

  a: int = 4
  b: str = 'b'
  tpl: Any = None


class NestedStructToTextTestClass(base_hyperparams.BaseParameterizable):

  _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

  class HParams(base_hyperparams.BaseHyperParams):
    tpl: Any = base_hyperparams.sub_config_field(None)
    a: Optional[frozen_dict.FrozenDict] = None


class FiddlifiedTestClass(base_hyperparams.FiddleBaseParameterizable):
  some_param: int = 1
  some_other_param: str = 'hello'


class HyperParamsTest(absltest.TestCase):

  def test_params_dataclass(self):
    x = SimpleTestClass.HParams(a=1)

    self.assertTrue(dataclasses.is_dataclass(x))
    self.assertEqual(1, x.a)
    self.assertEqual('b', x.b)
    # TODO(b/225403281): Enable the following once dataclasses are frozen.
    # _ = hash(x)  # Hash should work.
    cls_repr = ("SimpleTestClass.HParams(a=1, b='b', "
                "cls=<class '__main__.SimpleTestClass'>)")
    self.assertEqual(cls_repr, repr(x))

  def test_params_child(self):
    x = SimpleTestChild.HParams(a=1)

    self.assertTrue(dataclasses.is_dataclass(x))
    self.assertEqual(1, x.a)
    self.assertEqual('b', x.b)
    self.assertEqual(2.0, x.c)
    # TODO(b/225403281): Enable the following once dataclasses are frozen.
    # _ = hash(x)  # Hash should work.
    self.assertEqual(
        "SimpleTestChild.HParams(a=1, b='b', "
        "cls=<class '__main__.SimpleTestChild'>, c=2.0)", repr(x))

  def test_overriding_param_without_listing(self):
    with self.assertRaisesRegex(AttributeError, 'Attribute b was overridden'):

      class Broken(SimpleTestClass):

        class HParams(SimpleTestClass.HParams):
          b: bool

      _ = Broken.HParams(a=1)

  def test_overriding_param_with_listing(self):

    class Works(SimpleTestClass):

      class HParams(SimpleTestClass.HParams):
        _attribute_overrides = ('b',)
        b: bool

    x = Works.HParams(a=1, b=False)
    expected = ('Works.HParams(a=1, b=False, cls=<class '
                "'__main__.HyperParamsTest.test_overriding_param_with_listing."
                "<locals>.Works'>)")
    got = repr(x)[-len(expected):]
    self.assertEqual(got, expected, f'full repr: {repr(x)}')

  def test_to_text(self):
    x = NestedTestClass.HParams(
        d=SimpleTestChild.HParams(a=456, b='hello'), e=37)
    self.assertEqual(
        x.to_text(),
        textwrap.dedent("""\
        cls : type/__main__/NestedTestClass
        d.a : 456
        d.b : 'hello'
        d.c : 2.0
        d.cls : type/__main__/SimpleTestChild
        e : 37
        """))

  def test_fdl_config_to_text(self):
    x = FiddleTestClass.HParams(
        f=pax_fiddle.Config(sample_fn, x=[pax_fiddle.Config(sample_fn, 2),
                                          pax_fiddle.Config(sample_fn, 3, 4)]),
        g=pax_fiddle.Config(SimpleTestClass, SimpleTestClass.HParams(a=12)))
    self.assertEqual(
        x.to_text(),
        textwrap.dedent("""\
        cls : type/__main__/FiddleTestClass
        f.cls : callable/__main__/sample_fn
        f.x[0].cls : callable/__main__/sample_fn
        f.x[0].x : 2
        f.x[0].y : 5
        f.x[1].cls : callable/__main__/sample_fn
        f.x[1].x : 3
        f.x[1].y : 4
        f.y : 5
        g.cls : type/__main__/SimpleTestClass
        g.hparams.a : 12
        g.hparams.b : 'b'
        g.hparams.cls : type/__main__/SimpleTestClass
        h : 3.0
        """))

  def test_frozen_dict_to_text(self):
    x = frozen_dict.FrozenDict(foo=12, bar=55)
    self.assertEqual(base_hyperparams.nested_struct_to_text(x),
                     textwrap.dedent("""\
                     bar : 55
                     foo : 12
                     """))

  # Internal test test_config_dict_to_text
  def test_freeze_params(self):
    # pylint: disable=protected-access
    x = NestedTestClass.HParams(
        d=SimpleTestChild.HParams(a=456, b='hello'), e=37)
    x.freeze()
    with self.assertRaises(AttributeError):
      x.d.a = 100
    x.unfreeze()
    x.d.a = 200
    self.assertEqual(200, x.d.a)
    x.freeze()
    self.assertEqual(True, x._internal_frozen)
    self.assertEqual(True, x.d._internal_frozen)
    x_clone = x.clone()
    self.assertEqual(200, x_clone.d.a)
    self.assertEqual(False, x_clone._internal_frozen)
    x_clone.d.a = 300
    self.assertEqual(300, x_clone.d.a)
    # pylint: enable=protected-access

  def test_copy_fields(self):
    e_new = 0.123
    a_new = 123
    b_new = '456'
    p_b = NestedNestedTestClass.HParams(
        tpl=NestedTestClass.HParams(
            e=e_new, d=SimpleTestChild.HParams(a=a_new, b=b_new)))
    p_bb = NestedNestedOverrideTestClass.HParams(
        tpl=NestedTestBehaveClass.HParams(
            e=0.0, d=SimpleTestChild.HParams(a=0, b='')))
    p_bb.copy_fields_from(p_b)
    self.assertEqual(p_bb.cls, NestedNestedOverrideTestClass)
    self.assertEqual(p_bb.tpl.cls, NestedTestClass)  # cls is overwritten too.
    self.assertEqual(p_bb.tpl.d.cls, SimpleTestChild)
    self.assertEqual(p_bb.tpl.e, e_new)
    self.assertEqual(p_bb.tpl.d.a, a_new)
    self.assertEqual(p_bb.tpl.d.b, b_new)

  def test_fiddle_params_config(self):
    config = SimpleTestClass.HParams.config(a=1)
    config.a = 2
    params = base_hyperparams.instantiate(config)
    self.assertIsInstance(params, SimpleTestClass.HParams)
    self.assertEqual(2, params.a)

  def test_fiddle_params_partial(self):
    config = SimpleTestClass.HParams.partial(a=1)
    config.a = 2
    params_fn = base_hyperparams.instantiate(config)
    self.assertIsInstance(params_fn, functools.partial)
    self.assertEqual(2, params_fn.keywords['a'])

    # Instantiate the partial.
    params = params_fn()
    self.assertIsInstance(params, SimpleTestClass.HParams)
    self.assertEqual(2, params.a)

    # Should allow overrides like any functools.partial object.
    params = params_fn(a=3)
    self.assertEqual(3, params.a)

  def test_fiddle_allowed_parameters(self):
    p = SimpleTestClass.config()
    p.a = 5
    obj = base_hyperparams.instantiate(p)
    self.assertIsInstance(obj.hparams, SimpleTestClass.HParams)
    self.assertEqual(5, obj.hparams.a)
    self.assertEqual('b', obj.hparams.b)

  def test_fiddle_overrides_defaults(self):
    p = SimpleTestClass.config(a=42, b='c')
    obj = base_hyperparams.instantiate(p)
    self.assertIsInstance(obj, SimpleTestClass)
    self.assertIsInstance(obj.hparams, SimpleTestClass.HParams)
    self.assertEqual(42, obj.hparams.a)
    self.assertEqual('c', obj.hparams.b)

  def test_fiddle_eager_error_checking(self):
    p = SimpleTestClass.config()
    with self.assertRaisesRegex(
        TypeError,
        "No parameter named 'not_there' exists.*valid parameter names: a, b"):
      p.not_there = 5

    with self.assertRaisesRegex(TypeError, 'invalid_name'):
      _ = SimpleTestClass.config(invalid_name=5)

  def test_fiddle_nested(self):
    p = NestedTestClass.config()
    p.d = SimpleTestChild.config(a=40, c=-1.3)
    p.d.child = SimpleTestClass.config()  # TODO(saeta): use __fiddle_init__?
    p.d.child.a = 42
    p.d.child.b = 'very_nested_b'

    obj = base_hyperparams.instantiate(p)

    self.assertIsInstance(obj.hparams, NestedTestClass.HParams)
    self.assertIsInstance(obj.hparams.d, SimpleTestChild)
    self.assertIsInstance(obj.hparams.d.child, SimpleTestClass)
    self.assertEqual(obj.hparams.e, 3.0)
    self.assertEqual(obj.hparams.d.hparams.a, 40)
    self.assertEqual(obj.hparams.d.hparams.b, 'b')
    self.assertEqual(obj.hparams.d.hparams.c, -1.3)
    self.assertEqual(obj.hparams.d.child.hparams.a, 42)
    self.assertEqual(obj.hparams.d.child.hparams.b, 'very_nested_b')

  def test_fiddle_serialization(self):
    p = SimpleTestClass.config(a=24)
    reloaded = pickle.loads(pickle.dumps(p))
    obj = base_hyperparams.instantiate(reloaded)

    self.assertIsInstance(obj, SimpleTestClass)
    self.assertIsInstance(obj.hparams, SimpleTestClass.HParams)
    self.assertEqual(24, obj.hparams.a)
    self.assertEqual('b', obj.hparams.b)

  def test_fiddle_partial(self):
    p = SimpleTestClass.partial()
    partial = base_hyperparams.instantiate(p)
    obj = partial(a=10, b='my_b')

    self.assertIsInstance(obj, SimpleTestClass)
    self.assertIsInstance(obj.hparams, SimpleTestClass.HParams)
    self.assertEqual(10, obj.hparams.a)
    self.assertEqual('my_b', obj.hparams.b)

  def test_no_extra_init_arguments(self):
    simple_init_signature = inspect.signature(SimpleTestClass)
    self.assertNotIn('_config_init_name_for_params_object',
                     simple_init_signature.parameters)
    self.assertNotIn('_nonconfigurable_init_args',
                     simple_init_signature.parameters)

    child_init_signature = inspect.signature(SimpleTestChild)
    self.assertNotIn('_config_init_name_for_params_object',
                     child_init_signature.parameters)
    self.assertNotIn('_nonconfigurable_init_args',
                     child_init_signature.parameters)

  def test_duplicate_parameters(self):
    with self.assertRaisesRegex(TypeError, r'Duplicated parameter.*foo'):

      class DuplicatedParameter(base_hyperparams.BaseParameterizable):  # pylint: disable=unused-variable

        _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

        class HParams(base_hyperparams.BaseHyperParams):
          foo: int = 0

        def __init__(self,
                     hparams: base_hyperparams.BaseParameterizable.HParams,
                     foo: int = 7):
          pass

  def test_improper_init_arg_name(self):
    with self.assertRaisesRegex(
        TypeError, r'WrongInit.__init__ must have a parameter '
        r'named hparams'):

      class WrongInit(base_hyperparams.BaseParameterizable):  # pylint: disable=unused-variable

        _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

        class HParams(base_hyperparams.BaseHyperParams):
          something: int = 42

        def __init__(self, p: base_hyperparams.BaseParameterizable.HParams):
          pass

  def test_make_factories(self):

    class DefaultFactoryTestClass(base_hyperparams.BaseParameterizable):

      _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

      class HParams(base_hyperparams.BaseHyperParams):
        a: List[str] = dataclasses.field(default_factory=lambda: [1, 2, 3])

    instance_1 = DefaultFactoryTestClass.make()
    instance_2 = DefaultFactoryTestClass.make()
    self.assertEqual(instance_1.hparams.a, [1, 2, 3])
    instance_1.hparams.a.append(4)
    self.assertEqual(instance_1.hparams.a, [1, 2, 3, 4])
    self.assertEqual(instance_2.hparams.a, [1, 2, 3])

  def test_fiddle_factory_integration(self):

    class Foo(base_hyperparams.BaseParameterizable):

      _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

      class HParams(base_hyperparams.BaseHyperParams):
        foo_a: int = 0

    class Bar(base_hyperparams.BaseParameterizable):

      _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

      class HParams(base_hyperparams.BaseHyperParams):
        foo_tpl: base_hyperparams.BaseHyperParams = (
            base_hyperparams.sub_config_field(Foo.HParams))

    field, = [
        field for field in dataclasses.fields(Bar.HParams)
        if field.name == 'foo_tpl'
    ]
    self.assertIsInstance(field.default_factory,
                          base_hyperparams.SubConfigFactory)
    cfg = Bar.HParams.config()
    cfg.foo_tpl.foo_a = 1
    bar_params = pax_fiddle.build(cfg)
    self.assertEqual(bar_params.foo_tpl.foo_a, 1)

  def test_hparams_special_attributes(self):

    class Foo(base_hyperparams.BaseParameterizable):

      _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

      class HParams(base_hyperparams.BaseHyperParams):
        """Test."""
        foo_a: int = 0

    self.assertEqual(Foo.HParams.__doc__, 'Test.')
    self.assertRegex(Foo.HParams.__module__,
                     r'__main__|\.base_hyperparams_test')
    self.assertEqual(Foo.HParams.__name__, 'HParams')
    self.assertEqual(
        Foo.HParams.__qualname__,
        'HyperParamsTest.test_hparams_special_attributes.<locals>.Foo.HParams')

  def test_override_sub_config_field_protocol(self):

    class CustomSubConfigField(base_hyperparams.OverrideSubConfigFieldProtocol):

      def __to_sub_config_field__(self):
        return dataclasses.field(metadata={'custom': True})

    class Foo(base_hyperparams.BaseParameterizable):

      _USE_DEPRECATED_HPARAMS_BASE_PARAMETERIZABLE = True

      class HParams(base_hyperparams.BaseHyperParams):
        a_tpl: Any = base_hyperparams.sub_config_field(CustomSubConfigField())

    field, = (
        field for field in dataclasses.fields(Foo.HParams)
        if field.name == 'a_tpl')
    self.assertTrue(field.metadata.get('custom'))


class FiddleBaseParameterizableTest(absltest.TestCase):

  def test_can_construct_class(self):
    instance = FiddlifiedTestClass(some_param=-1, some_other_param='goodbye')
    self.assertEqual(instance.some_param, -1)
    self.assertEqual(instance.some_other_param, 'goodbye')

  def test_can_construct_class_via_hparams_and_instantiate(self):
    hparams = FiddlifiedTestClass.HParams()
    self.assertIsInstance(hparams, pax_fiddle.Config)
    hparams.some_param = -1
    hparams.some_other_param = 'goodbye'

    instance = pax_fiddle.instantiate(hparams)
    self.assertEqual(instance.some_param, -1)
    self.assertEqual(instance.some_other_param, 'goodbye')

  def test_can_access_fields_via_hparams_instance_attribute(self):
    instance = FiddlifiedTestClass(some_param=-1, some_other_param='goodbye')
    self.assertEqual(instance.hparams.some_param, -1)
    self.assertEqual(instance.hparams.some_other_param, 'goodbye')

  def test_hparams_instance_stub_is_frozen(self):
    instance = FiddlifiedTestClass(some_param=-1, some_other_param='goodbye')
    with self.assertRaises(AttributeError):
      instance.hparams.some_param = 3

  def test_can_only_construct_with_kwargs(self):
    expected_msg = (
        r'Only keyword arguments are supported when constructing '
        r"<class '.*FiddlifiedTestClass'>. Received \(-1, 'goodbye'\) as "
        r'positional arguments\.'
    )
    with self.assertRaisesRegex(TypeError, expected_msg):
      FiddlifiedTestClass(-1, 'goodbye')

  def test_config_stub(self):
    cfg = FiddlifiedTestClass.config(some_param=3)
    instance = pax_fiddle.instantiate(cfg)
    self.assertEqual(instance.some_param, 3)

  def test_hparams_class_stubs_forwards_cls(self):
    self.assertIs(FiddlifiedTestClass.HParams.cls, FiddlifiedTestClass)

  def test_hparams_class_stub_is_serializable(self):
    hparams_cfg = pax_fiddle.Config(FiddlifiedTestClass.HParams, some_param=3)

    # Ensure we can serialize and deserialize an HParams config.
    json = fdl_serialization.dump_json(hparams_cfg)
    deserialized_hparams_cfg = fdl_serialization.load_json(json)
    self.assertEqual(deserialized_hparams_cfg.some_param, 3)

    # Check that instantiating the HParams stub gives us a pax_fiddle.Config.
    cfg_instance = pax_fiddle.instantiate(deserialized_hparams_cfg)
    self.assertIsInstance(cfg_instance, pax_fiddle.Config)
    self.assertEqual(cfg_instance.some_param, 3)

    # And finally we can actually get an instance of FiddlifiedTestClass.
    instance = pax_fiddle.instantiate(cfg_instance)
    self.assertIsInstance(instance, FiddlifiedTestClass)
    self.assertEqual(instance.some_param, 3)

  def test_missing_type_annotation(self):
    with self.assertRaisesRegex(TypeError, 'some_param.*int'):
      class MissingTypeAnnotation(FiddlifiedTestClass):
        some_param = 2


class CheckpointLoadingRules(NamedTuple):
  task_p: str = 'my task'
  safe_load: bool = False


class CheckPointRuleTest(base_hyperparams.FiddleBaseParameterizable):
  init_from_checkpoint_rules: Dict[str, CheckpointLoadingRules] = (
      pax_fiddle.instance_field(default_factory=dict)
  )


class CheckPointRuleDataclassTest(base_hyperparams.FiddleBaseParameterizable):

  @dataclasses.dataclass
  class Train(base_hyperparams.FiddleBaseParameterizable):
    init_from_checkpoint_rules: Optional[Dict[str, CheckpointLoadingRules]] = (
        None
    )


class NestedStructToTextTestCase(absltest.TestCase):

  def test_dict(self):
    self.assertEqual(
        nested_struct_to_text({
            'hi': 7,
            'bye': 3
        }).splitlines(), [
            'bye : 3',
            'hi : 7',
        ])

  def test_hparams_frozen_dict(self):
    input_dict = frozen_dict.FrozenDict({'hi': 7, 'bye': 3})
    x = NestedStructToTextTestClass.HParams(a=input_dict)
    self.assertEqual(
        nested_struct_to_text(x).splitlines(), [
            'a.bye : 3',
            'a.hi : 7',
            f'cls : type/{__name__}/NestedStructToTextTestClass',
            'tpl : NoneType',
        ])

  def test_frozen_dict(self):
    x = frozen_dict.FrozenDict(foo=12, bar=55)
    self.assertEqual(
        nested_struct_to_text(x).splitlines(), [
            'bar : 55',
            'foo : 12',
        ])

  def test_named_tuple(self):

    class MyNamedTuple(NamedTuple):
      b: int
      a: str

    self.assertEqual(
        nested_struct_to_text(MyNamedTuple(7, 'hi')).splitlines(),
        ["[a] : 'hi'", '[b] : 7'],
    )

  def test_np_array(self):
    self.assertEqual(
        nested_struct_to_text(np.array([1, 2.1, 3.01, 4.001])).splitlines(), [
            ' : [1.   , 2.1  , 3.01 , 4.001]',
        ])

  def test_tf_dtype(self):
    self.assertEqual(
        nested_struct_to_text(tf.float32).splitlines(), [
            ' : float32',
        ])

  def test_sub_config(self):
    sub_config = SimpleTestClass.HParams(7)
    x = NestedStructToTextTestClass.HParams(tpl=sub_config)
    self.assertEqual(
        nested_struct_to_text(x).splitlines(), [
            'a : NoneType',
            f'cls : type/{__name__}/NestedStructToTextTestClass',
            'tpl.a : 7',
            "tpl.b : 'b'",
            f'tpl.cls : type/{__name__}/SimpleTestClass',
        ])

  def test_sub_fiddle_config(self):
    sub_config = pax_fiddle.Config(FiddleToTextTestClass, 7)
    x = NestedStructToTextTestClass.HParams(tpl=sub_config)
    self.assertEqual(
        nested_struct_to_text(x).splitlines(),
        [
            'a : NoneType',
            f'cls : type/{__name__}/NestedStructToTextTestClass',
            'tpl.a : 4',
            'tpl.activation_split_dims_mapping.out : NoneType',
            "tpl.b : 'b'",
            f"tpl.cls : <class '{__name__}.FiddleToTextTestClass'>",
            'tpl.contiguous_submeshes : False',
            'tpl.dcn_mesh_shape : NoneType',
            'tpl.dtype : 7',
            'tpl.fprop_dtype : NoneType',
            'tpl.ici_mesh_shape : NoneType',
            'tpl.mesh_axis_names : NoneType',
            'tpl.name : NoneType',
            "tpl.params_init.cls : <class 'praxis.base_layer.WeightInit'>",
            "tpl.params_init.method : 'xavier'",
            'tpl.params_init.scale : 1.000001',
            'tpl.shared_weight_layer_id : NoneType',
            'tpl.skip_lp_regularization : NoneType',
            'tpl.tpl : NoneType',
            'tpl.weight_split_dims_mapping.wt : NoneType',
        ],
    )

  def test_sub_hparams_config(self):
    sub_config = SimpleTestClass.HParams(7)
    x = pax_fiddle.Config(FiddleToTextTestClass, 7, tpl=sub_config)
    self.assertEqual(
        nested_struct_to_text(x).splitlines(),
        [
            'a : 4',
            'activation_split_dims_mapping.out : NoneType',
            "b : 'b'",
            f"cls : <class '{__name__}.FiddleToTextTestClass'>",
            'contiguous_submeshes : False',
            'dcn_mesh_shape : NoneType',
            'dtype : 7',
            'fprop_dtype : NoneType',
            'ici_mesh_shape : NoneType',
            'mesh_axis_names : NoneType',
            'name : NoneType',
            "params_init.cls : <class 'praxis.base_layer.WeightInit'>",
            "params_init.method : 'xavier'",
            'params_init.scale : 1.000001',
            'shared_weight_layer_id : NoneType',
            'skip_lp_regularization : NoneType',
            'tpl.a : 7',
            "tpl.b : 'b'",
            f'tpl.cls : type/{__name__}/SimpleTestClass',
            'weight_split_dims_mapping.wt : NoneType',
        ],
    )

  def test_config_in_dict(self):
    sub_config = SimpleTestClass.HParams(7)
    x = {'foo': sub_config, 'bar': 3}
    self.assertEqual(
        nested_struct_to_text(x).splitlines(), [
            'bar : 3',
            'foo.a : 7',
            "foo.b : 'b'",
            f'foo.cls : type/{__name__}/SimpleTestClass',
        ])

  def test_config_in_list(self):
    config = SimpleTestClass.HParams(7)
    self.assertEqual(
        nested_struct_to_text([config]).splitlines(), [
            '[0].a : 7',
            "[0].b : 'b'",
            f'[0].cls : type/{__name__}/SimpleTestClass',
        ])

  def test_mixed_list(self):
    config = SimpleTestClass.HParams(7)
    self.assertEqual(
        nested_struct_to_text([config, 1]).splitlines(), [
            " : [{'a': 7, 'b': 'b', 'cls': 'type/" + __name__ +
            "/SimpleTestClass'}, 1]",
        ])

  def test_mixed_fiddle_list(self):
    config = pax_fiddle.Config(FiddleToTextTestClass, 7)
    # pylint: disable=implicit-str-concat
    self.assertEqual(
        nested_struct_to_text([config, 1]).splitlines(),
        [
            (
                ' : ["<PaxConfig[FiddleToTextTestClass(\\n  dtype=7,\\n '
                ' params_init='
                "<PaxConfig[WeightInit(method='xavier', scale=1.000001)]>,\\n  "
                'weight_split_dims_mapping[#praxis.pax_fiddle.DoNotBuild]=<'
                'PaxConfig[BaseLayer.WeightSharding()]>,\\n  '
                'activation_split_dims_mapping[#praxis.pax_fiddle.DoNotBuild]=<'
                'PaxConfig[BaseLayer.ActivationSharding()]>)]>", 1]'
            ),
        ],
    )
    # pylint: enable=implicit-str-concat

  def test_callable(self):

    def foo():
      return 7

    # pylint: disable=implicit-str-concat
    self.assertEqual(
        nested_struct_to_text(foo).splitlines(), [
            f' : callable/{__name__}/'
            'NestedStructToTextTestCase.test_callable.<locals>.foo',
        ])
    # pylint: enable=implicit-str-concat

  def test_list(self):
    self.assertEqual(
        nested_struct_to_text([1, 2, 3.1]).splitlines(), [
            ' : [1, 2, 3.1]',
        ])

  def test_tuple(self):
    self.assertEqual(
        nested_struct_to_text((1, 2, 3.1)).splitlines(), [
            ' : (1, 2, 3.1)',
        ])

  def test_jax_dtype(self):
    self.assertEqual(
        nested_struct_to_text(jnp.float32).splitlines(), [
            ' : type/jax.numpy/float32',
        ])

  def test_named_tuple_subconfig(self):
    sub_config = CheckpointLoadingRules()
    checkpoint_rule_config = pax_fiddle.Config(
        CheckPointRuleTest,
        name='my_checkpoint_rules',
        init_from_checkpoint_rules=sub_config,
    )
    self.assertEqual(
        nested_struct_to_text(checkpoint_rule_config).splitlines(),
        [
            "cls : <class '__main__.CheckPointRuleTest'>",
            'init_from_checkpoint_rules[safe_load] : False',
            "init_from_checkpoint_rules[task_p] : 'my task'",
            "name : 'my_checkpoint_rules'",
        ],
    )

  def test_named_tuple_dataclass_subconfig(self):
    sub_config = CheckpointLoadingRules()
    x = pax_fiddle.Config(
        CheckPointRuleDataclassTest.Train,
        name='my_checkpoint_rules',
        init_from_checkpoint_rules=sub_config,
    )
    self.assertEqual(
        nested_struct_to_text(x).splitlines(),
        [
            "cls : <class '__main__.CheckPointRuleDataclassTest.Train'>",
            'init_from_checkpoint_rules[safe_load] : False',
            "init_from_checkpoint_rules[task_p] : 'my task'",
            "name : 'my_checkpoint_rules'",
        ],
    )

  def test_circular_reference_chain(self):
    p = SimpleTestChild.config(a=40, c=-1.3)
    p.child = p
    with self.assertRaisesRegex(
        ValueError, 'A circular reference chain is detected'
    ):
      nested_struct_to_text(p, lambda key, val: None)


if __name__ == '__main__':
  absltest.main()
