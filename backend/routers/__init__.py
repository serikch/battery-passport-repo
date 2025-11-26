"""
Routers Battery Passport API
Export des routers pour montage dans main.py
"""

from . import batteries
from . import modules
from . import notifications

__all__ = ["batteries", "modules", "notifications"]