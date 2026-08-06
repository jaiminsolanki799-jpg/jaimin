# python-playground

Python practice code. Starts with a small calculator module and its test suite,
so there is a working example of the source/tests split to build on.

## Layout

```
python-playground/
├── README.md
├── requirements.txt
├── src/
│   └── calculator.py
└── tests/
    └── test_calculator.py
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python src/calculator.py
```

## Test

```bash
pytest
```

## Adding an exercise

Put the code in `src/`, put its tests in `tests/test_<name>.py`, and run
`pytest` before committing.
