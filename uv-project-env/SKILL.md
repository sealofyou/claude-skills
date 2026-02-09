---
name: uv-project-env
description: Automatically use UV to create and manage project-local virtual environments for Python projects. Use when working with any Python project (GitHub repo, cloned directory, or local project) to ensure isolated dependencies per project. Automatically activates when: (1) Cloning/working with GitHub repositories containing Python code, (2) Setting up new Python projects, (3) Installing Python packages in a project directory, (4) Running Python scripts that need dependencies.
---

# UV Project Environment

## Core Principle

**Every Python project gets its own isolated UV virtual environment in the project directory.**

Never use global Python or virtual environments outside the project directory.

## When to Activate

This skill activates automatically when:
- User mentions cloning a GitHub repo with Python code
- Working in a directory containing `pyproject.toml`, `requirements.txt`, or `.py` files
- User asks to install Python packages
- User asks to run Python scripts/tests

## Workflow

### 1. New Project or Cloned Repo

When entering a Python project directory for the first time:

```bash
# Check if .venv already exists
test -d .venv || uv venv
```

### 2. Installing Dependencies

Always use UV with the project's `.venv`:

```bash
# Install from requirements.txt
uv pip install -r requirements.txt

# Install specific package
uv pip install <package-name>

# Install in editable mode
uv pip install -e .
```

### 3. Running Commands

Use UV to run Python commands with the project's virtual environment:

```bash
# Run Python script
uv run python script.py

# Run tests
uv run pytest

# Run any command
uv run <command>
```

## Environment Detection

A directory is a Python project if it contains:
- `pyproject.toml`
- `requirements.txt`
- `setup.py`
- Any `.py` files

## Key Commands

| Action | Command |
|--------|---------|
| Create venv | `uv venv` or `uv venv .venv` |
| Install package | `uv pip install <package>` |
| Install from file | `uv pip install -r requirements.txt` |
| Run with venv | `uv run <command>` |
| Sync dependencies | `uv sync` (if pyproject.toml exists) |
