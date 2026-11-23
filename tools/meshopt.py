"""Kvalitní zjednodušení sítí pomocí knihovny meshoptimizer (MIT), volané přes ctypes.

Knihovna je přeložená ze zdrojů https://github.com/zeux/meshoptimizer do libmeshopt.so.
"""
import ctypes
import os
import numpy as np

_lib = ctypes.CDLL(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'libmeshopt.so'))
_lib.meshopt_simplify.restype = ctypes.c_size_t
_lib.meshopt_simplify.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t,
                                  ctypes.c_size_t, ctypes.c_size_t, ctypes.c_float, ctypes.c_uint,
                                  ctypes.POINTER(ctypes.c_float)]
_lib.meshopt_simplifyWithAttributes.restype = ctypes.c_size_t
_lib.meshopt_simplifyWithAttributes.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t,
                                                ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t,
                                                ctypes.c_void_p, ctypes.c_size_t, ctypes.c_float, ctypes.c_uint,
                                                ctypes.POINTER(ctypes.c_float)]
_lib.meshopt_optimizeVertexCache.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_size_t]
_lib.meshopt_optimizeVertexFetchRemap.restype = ctypes.c_size_t
_lib.meshopt_optimizeVertexFetchRemap.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_size_t]

ERROR_ABSOLUTE = 1 << 2
PRUNE = 1 << 3


def simplify(verts, faces, max_error, target_ratio=0.0, attrs=None, weights=None):
    """Zjednoduší síť; max_error je absolutní odchylka v jednotkách sítě (zde mm).

    attrs (N×k) a weights (k) – volitelné atributy vrcholů, jejichž změny má zjednodušení zachovat
    (např. hranice svalů)."""
    pos = np.ascontiguousarray(verts, dtype=np.float32)
    idx = np.ascontiguousarray(faces.ravel(), dtype=np.uint32)
    target = int(len(idx) * target_ratio) // 3 * 3
    dst = np.empty_like(idx)
    err = ctypes.c_float()
    if attrs is None:
        n = _lib.meshopt_simplify(dst.ctypes.data, idx.ctypes.data, len(idx), pos.ctypes.data, len(pos), 12,
                                  target, max_error, ERROR_ABSOLUTE | PRUNE, ctypes.byref(err))
    else:
        at = np.ascontiguousarray(attrs, dtype=np.float32).reshape(len(pos), -1)
        w = np.ascontiguousarray(weights, dtype=np.float32)
        n = _lib.meshopt_simplifyWithAttributes(dst.ctypes.data, idx.ctypes.data, len(idx), pos.ctypes.data, len(pos), 12,
                                                at.ctypes.data, at.shape[1] * 4, w.ctypes.data, at.shape[1], None,
                                                target, max_error, ERROR_ABSOLUTE | PRUNE, ctypes.byref(err))
    dst = np.ascontiguousarray(dst[:n])
    if n == 0:
        return np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
    _lib.meshopt_optimizeVertexCache(dst.ctypes.data, dst.ctypes.data, len(dst), len(pos))
    remap = np.empty(len(pos), dtype=np.uint32)
    count = _lib.meshopt_optimizeVertexFetchRemap(remap.ctypes.data, dst.ctypes.data, len(dst), len(pos))
    used = remap != 0xFFFFFFFF
    nv = np.zeros((count, 3))
    nv[remap[used]] = verts[used]
    return nv, remap[dst].reshape(-1, 3).astype(np.int64)
