# Description:
#   Language model servable parameters definition.

load("//saxml:saxml.bzl", "pytype_strict_library")

licenses(["notice"])

package(
    default_visibility = [
        "//saxml:internal",
        "//saxml/server:users",
    ],
)

pytype_strict_library(
    name = "template",
    srcs = ["template.py"],
    srcs_version = "PY3",
    deps = [
        "//saxml/server:servable_model_registry",
        "//saxml/server/pax/lm:lm_tokenizer",
        "//saxml/server/pax/lm:servable_lm_model",
        "//third_party/py/absl-py/flags",
        "//third_party/py/numpy",
        "//third_party/py/paxml:base_task",
        "//third_party/py/paxml:tasks_lib",
        "//third_party/py/praxis:base_layer",
        "//third_party/py/praxis:decoder_hparams",
        "//third_party/py/praxis:pax_fiddle",
        "//third_party/py/praxis:py_utils",
        "//third_party/py/praxis/layers:attentions",
        "//third_party/py/praxis/layers:multi_query_attention",
        "//third_party/py/praxis/layers:transformer_models",
        "//third_party/py/praxis/layers:transformers",
    ],
)

pytype_strict_library(
    name = "lm_cloud",
    srcs = ["lm_cloud.py"],
    srcs_version = "PY3",
    deps = [
        ":template",
        "//saxml/server:servable_model_registry",
        "//saxml/server/pax:quantization",
        "//third_party/py/jax",
        "//third_party/py/paxml:base_experiment",
        "//third_party/py/paxml:tasks_lib",
        "//third_party/py/paxml/tasks/lm/params",
        "//third_party/py/praxis:base_input",
        "//third_party/py/praxis:optimizers",
        "//third_party/py/praxis:pax_fiddle",
        "//third_party/py/praxis:schedules",
        "//third_party/py/praxis/layers",
        "//third_party/py/praxis/layers:activations",
    ],
)
