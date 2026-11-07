import sys
from pathlib import Path

# Upstream tests import scripts as top-level modules (e.g. `from validate_freshness import ...`).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
