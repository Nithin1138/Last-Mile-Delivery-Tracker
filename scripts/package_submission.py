#!/usr/bin/env python3
"""
Submission Packaging Script for Last-Mile Delivery Tracker.

Builds a clean, pristine, zero-bloat ZIP archive containing only source code,
configuration templates, tests, and documentation.

Excludes:
- node_modules/
- venv/
- dist/
- __pycache__/ & .pytest_cache/
- .git/
- .env (preserves .env.example)
- .DS_Store & OS artifacts
"""

import os
import sys
import zipfile
from pathlib import Path

EXCLUDED_DIR_NAMES = {
    "node_modules",
    "venv",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".git",
    ".idea",
    ".vscode",
    ".tmp",
}

EXCLUDED_FILE_NAMES = {
    ".DS_Store",
    ".env",
    "MASTER_DOCUMENT.md",
}

EXCLUDED_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".zip",
    ".pdf",
}


def should_exclude(path: Path, root_dir: Path) -> bool:
    rel_parts = path.relative_to(root_dir).parts

    # Exclude directories
    for part in rel_parts:
        if part in EXCLUDED_DIR_NAMES:
            return True

    # Exclude files
    if path.name in EXCLUDED_FILE_NAMES:
        return True

    # Exclude extensions
    if path.suffix in EXCLUDED_EXTENSIONS:
        return True

    return False


def build_submission_zip():
    root_dir = Path(__file__).resolve().parent.parent
    output_zip = root_dir / "LastMileDeliveryTracker-Submission.zip"

    if output_zip.exists():
        output_zip.unlink()

    print(f"📦 Packaging submission from: {root_dir}")
    file_count = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(root_dir):
            current_path = Path(root)
            
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIR_NAMES]

            for file_name in files:
                file_path = current_path / file_name
                if not should_exclude(file_path, root_dir):
                    arcname = file_path.relative_to(root_dir)
                    zip_file.write(file_path, arcname)
                    file_count += 1
                    total_uncompressed_bytes += file_path.stat().st_size

    zip_size_kb = output_zip.stat().st_size / 1024

    print("✅ Clean submission archive generated successfully!")
    print(f"📁 Destination: {output_zip.name}")
    print(f"📄 Files included: {file_count}")
    print(f"📏 Uncompressed size: {total_uncompressed_bytes / 1024:.1f} KB")
    print(f"📦 Archive size: {zip_size_kb:.1f} KB (clean, lightweight, zero bloat)")


if __name__ == "__main__":
    build_submission_zip()
