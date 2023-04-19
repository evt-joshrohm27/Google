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

"""Asserts-like functions that raise actual exceptions.

These asserts are convenient helpers to quickly validate parameters. If an
assert fails, it will by default raise a ValueError exception (this may be
overridden when the assert is defined). (The Google style guide prohibits using
`assert` when validating arguments to a function; see
https://google.github.io/styleguide/pyguide.html#244-decision for additional
context.)

The following asserts are currently defined:
  - asserts.none(a): Check that the value is equal to None.
  - asserts.not_none(a): Check that the value is not equal to None.
  - asserts.eq(a, b): Check that two values are equal.
  - asserts.ne(a, b): Check that two values are not equal.
  - asserts.instance(a, instances): Check that a has a type within `instances`.
  - asserts.subclass(a, subclasses): Check that a is a subclass of `subclasses`.
  - asserts.le(a, b): Check that `a <= b`.
  - asserts.lt(a, b): Check that `a < b`.
  - asserts.ge(a, b): Check that `a >= b`.
  - asserts.gt(a, b): Check that `a > b`.
  - asserts.in_set(a, elements): Check that a belongs to the set of `elements`.
  - asserts.between(a, min, max): Check that `min </= a </= max`.

They can be used as follows:
  asserts.eq(p.atten_dim, p.model_dim // p.dim_per_head)
If the assert statement does not fit on a single line, it is preferable to
explicitly set `value_str`-like argument to get nice error message, e.g.:
  asserts.between(
      p.dropout_rate,
      min_value=0.,
      max_value=1.,
      left_strict=True,
      right_strict=False,
      value_str=f'p.dropout_rate={p.dropout_rate}')

Assertions can be disabled by using an AssertsContext.  This is useful
when evaluating under jax2tf where shape are unknown at evaluation time,
causing assertion failures.  AssertsContext works as follows:

  with AssertsContext(enabled=False):
    asserts.eq(1,0) # Will not throw an assertion.
"""

import dataclasses
import inspect
from typing import Any, List, Optional, Sequence, Type

import jax
from jax.core import InconclusiveDimensionOperation
from praxis import py_utils

_AssertsContextStack = py_utils.ThreadLocalStack()


@dataclasses.dataclass
class AssertsContext:
  """Context to control assertions.

  The AssertsContext provide a way to disable all assertions.  This is typically
  intended to be used with jax2tf, where shapes may be unknown at evaluation
  time due to polymorphism.

  AssertsContexts can be nested if needed.

  Attributes:
    enabled: Boolean controlling whether assertions are enabled or not.
  """

  enabled: bool = True

  def __enter__(self) -> 'AssertsContext':
    _AssertsContextStack.stack.append(self)
    return self

  def __exit__(self, type_arg, value_arg, traceback_arg):
    assert _AssertsContextStack.stack
    assert _AssertsContextStack.stack[-1] is self
    _AssertsContextStack.stack.pop()

  @staticmethod
  def assertions_enabled() -> bool:
    """Returns whether assertions are enabled.

    This will find the most recent assertion context and return whether
    assertions are enabled for the most recently created context.  If there is
    no current context, defaults to True.

    Returns:
      Whether assertions are enabled, defaulting to True if no context exists.
    """
    if not _AssertsContextStack.stack:
      return True
    return _AssertsContextStack.stack[-1].enabled


def _retrieve_argnames(assert_name: str) -> Optional[List[str]]:
  """Retrieves the argnames of the upper level caller function.

  The expected usage is within an assert-like function from this module:
  It first extracts the corresponding line call as a string, and, second,
  retrieves the corresponding function arguments as a list of strings.

  Note that this only works when the function call fits on a single line,
  since the inspect module can only return a single line number for each frame.

  Args:
    assert_name: name of the assert function from which this helper was called.

  Returns:
    A list of arguments as strings. For instance, if the original user code with
    the assert function looks like:
      asserts.eq(p.atten_dim, p.model_dim // p.dim_per_head)
    it returns:
      ['p.atten_dim', 'p.model_dim // p.dim_per_head']
  """
  # Retrieve the code line as a string with the assert's call.
  frame = inspect.stack()[2].frame
  code_context = inspect.getframeinfo(frame).code_context[0].strip()
  first_p = code_context.find(f'{assert_name}(') + len(assert_name) + 1
  if first_p == -1:
    return None

  # Parse all the functions arguments from the assert's call. E.g.:
  # Input:  "   asserts.eq(alpha, beta, ...)\n"
  # Output: ['alpha', 'beta', ...]
  code_context = code_context[first_p:]
  open_p = 1
  last_start_index = 0
  current_index = 0
  args = []
  while open_p > 0 and current_index < len(code_context):
    current_char = code_context[current_index]
    if current_char == '(':
      open_p += 1
    elif current_char == ',' and open_p == 1:
      args.append(code_context[last_start_index:current_index].strip())
      last_start_index = current_index + 1
    elif current_char == ')':
      if open_p == 1:
        args.append(code_context[last_start_index:current_index].strip())
        break
      else:
        open_p -= 1
    current_index += 1
  return args or None


def _get_value_str(value: Any, arguments: Sequence[str], index: int = 0) -> str:
  """Returns the `value_str` given parsed `arguments` and the desired `index`.

  Args:
    value: The input value to generate a string representation for.
    arguments: The input sequence of arguments as returned by
      `_retrieve_argnames()`.
    index: The index of the argument in `arguments` correspoding to value.

  Returns:
    The corresponding `value_str` representation.
  """
  if arguments and len(arguments) > index:
    return f'{arguments[index]}={value}'
  return f'{value}'


def none(
    value: Any,
    *,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value` is None and raises an exception otherwise.

  Args:
    value: The element to compare against None.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value is None:
    return
  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('none')
      value_str = _get_value_str(value, arguments)
    error_msg = f'`{value_str}` must be `None`.'
  raise exception_type(error_msg)


def not_none(
    value: Any,
    *,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value` is not None and raises an exception otherwise.

  Args:
    value: The element to compare against None.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value is not None:
    return
  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('not_none')
      value_str = _get_value_str(value, arguments)
    error_msg = f'`{value_str}` must not be `None`.'
  raise exception_type(error_msg)


def eq(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1` and `value2` are equal.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 == value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('eq')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = f'`{value_str1}` must be equal to `{value_str2}`.'
  raise exception_type(error_msg)


def ne(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1` and `value2` are not equal.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 != value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('ne')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = f'`{value_str1}` must not be equal to `{value_str2}`.'
  raise exception_type(error_msg)


def instance(
    value: Any,
    instances: Any,
    *,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value` is of `instance` type.

  Raises an exception otherwise.

  Args:
    value: The element to compare against None.
    instances: A type or a tuple of types.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if isinstance(value, instances):
    return
  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('instance')
      value_str = _get_value_str(value, arguments)
    error_msg = f'`{value_str}` must be of type `{instances}`.'
  raise exception_type(error_msg)


def subclass(
    value: Any,
    subclasses: Any,
    *,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value` is a subclass of one of the provided `subclasses`.

  Raises an exception otherwise.

  Args:
    value: The element to compare against None.
    subclasses: A class or a tuple of classess.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if issubclass(value, subclasses):
    return
  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('subclasses')
      value_str = _get_value_str(value, arguments)
    error_msg = f'`{value_str}` must be a subclass of `{subclasses}`.'
  raise exception_type(error_msg)


def le(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1 <= value2`.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 <= value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('le')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = f'`{value_str1}` must be less than or equal to `{value_str2}`.'
  raise exception_type(error_msg)


def lt(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1 < value2`.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 < value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('lt')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = f'`{value_str1}` must be strictly less than `{value_str2}`.'
  raise exception_type(error_msg)


def ge(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1 >= value2`.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 >= value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('ge')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = (
        f'`{value_str1}` must be greater than or equal to `{value_str2}`.'
    )
  raise exception_type(error_msg)


def gt(
    value1: Any,
    value2: Any,
    *,
    value_str1: Optional[str] = None,
    value_str2: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value1 > value2`.

  Raises an exception otherwise.

  Args:
    value1: The first element to compare against.
    value2: The second element to compare against.
    value_str1: Optional string representation of the `value1` element used in
      the exception message overriding the default one.
    value_str2: Optional string representation of the `value2` element used in
      the exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if value1 > value2:
    return
  if msg:
    error_msg = msg
  else:
    if value_str1 is None or value_str2 is None:
      arguments = _retrieve_argnames('gt')
      if value_str1 is None:
        value_str1 = _get_value_str(value1, arguments, index=0)
      if value_str2 is None:
        value_str2 = _get_value_str(value2, arguments, index=1)
    error_msg = f'`{value_str1}` must be strictly greater than `{value_str2}`.'
  raise exception_type(error_msg)


def in_set(
    value: Any,
    elements: Sequence[Any],
    *,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `value` is within the valid `elements`.

  Raises an exception otherwise.

  Args:
    value: The element to look up for.
    elements: The list of valid elements. Raises if `value` is not in this set.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  try:
    if value in elements:
      return
  except InconclusiveDimensionOperation:
    # In jax2tf context, comparisons like `b == 1` will raise an
    # InconclusiveDimensionOperation which we should regard as False.
    for e in elements:
      try:
        if value == e:
          return
      except InconclusiveDimensionOperation:
        pass

  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('in_set')
      value_str = _get_value_str(value, arguments)
    error_msg = f'`{value_str}` must be within `{elements}`.'
  raise exception_type(error_msg)


def between(
    value: Any,
    min_value: Any,
    max_value: Any,
    *,
    left_strict: bool = False,
    right_strict: bool = False,
    value_str: Optional[str] = None,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  """Checks that `min_value </= value </= max_value`.

  Raises an exception otherwise.

  Args:
    value: The element to compare against.
    min_value: The minimum value of the valid range.
    max_value: The maximum value of the valid range.
    left_strict: Whether the left inequality for the range is strict or not.
    right_strict: Whether the right inequality for the range is strict or not.
    value_str: Optional string representation of the `value` element used in the
      exception message overriding the default one.
    msg: Optional exception message overriding the default one.
    exception_type: Type of exception to raise.
  """
  if not AssertsContext.assertions_enabled():
    return
  if (
      (left_strict and right_strict and min_value < value < max_value)
      or (not left_strict and right_strict and min_value <= value < max_value)
      or (left_strict and not right_strict and min_value < value <= max_value)
      or (
          not left_strict
          and not right_strict
          and min_value <= value <= max_value
      )
  ):
    return
  if msg:
    error_msg = msg
  else:
    if value_str is None:
      arguments = _retrieve_argnames('between')
      value_str = _get_value_str(value, arguments)
    left_bracket = '(' if left_strict else '['
    right_bracket = ')' if right_strict else ']'
    error_msg = (
        f'`{value_str}` must be in the range '
        f'`{left_bracket}{min_value}, {max_value}{right_bracket}`.'
    )
  raise exception_type(error_msg)


def assert_same_structure(
    x: Any,
    y: Any,
    msg: Optional[str] = None,
    exception_type: Type[Exception] = ValueError,
) -> None:
  if not AssertsContext.assertions_enabled():
    return
  # Jax doesn't recognize NestedMap so it is treated as a customnode
  if hasattr(x, 'ToNestedDict'):
    x = x.ToNestedDict()
  if hasattr(y, 'ToNestedDict'):
    y = y.ToNestedDict()

  def is_leaf(i: Any):
    if isinstance(i, dict):
      return False
    if isinstance(i, list):
      return False
    if isinstance(i, tuple):
      return False
    return True

  x = jax.tree_util.tree_structure(x, is_leaf)
  y = jax.tree_util.tree_structure(y, is_leaf)
  if x == y:
    return
  if msg:
    error_msg = msg
  else:
    error_msg = (
        'Not the same structure\n'
        f'Entire first structure: `{x}`\n'
        f'Entire second structure: `{y}`\n'
    )
  raise exception_type(error_msg)
