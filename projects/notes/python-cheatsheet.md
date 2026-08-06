# Python cheatsheet

## Data types

```python
n = 42                 # int
pi = 3.14              # float
name = "jaimin"        # str
ok = True              # bool
items = [1, 2, 3]      # list   — ordered, mutable
point = (1, 2)         # tuple  — ordered, immutable
unique = {1, 2, 3}     # set    — unordered, no duplicates
ages = {"a": 1}        # dict   — key/value pairs
```

## Strings

```python
f"Hello, {name}"       # f-string
name.upper()
name.strip()
",".join(["a", "b"])   # "a,b"
"a,b".split(",")       # ["a", "b"]
```

## Control flow

```python
if n > 10:
    print("big")
elif n == 10:
    print("ten")
else:
    print("small")

for item in items:
    print(item)

for i, item in enumerate(items):
    print(i, item)

while n > 0:
    n -= 1
```

## Functions

```python
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

greet("Jaimin")
greet("Jaimin", greeting="Hi")
```

## Comprehensions

```python
squares = [x * x for x in range(10)]
evens = [x for x in range(10) if x % 2 == 0]
lookup = {word: len(word) for word in ["a", "bb"]}
```

## Dictionaries

```python
ages["b"] = 2          # set
ages.get("c", 0)       # read with a default
ages.keys()
ages.values()
for key, value in ages.items():
    print(key, value)
```

## Files

```python
with open("data.txt") as f:
    text = f.read()

with open("out.txt", "w") as f:
    f.write("hello")
```

## Errors

```python
try:
    value = 1 / 0
except ZeroDivisionError as err:
    print(err)
finally:
    print("always runs")
```

## Classes

```python
class Dog:
    def __init__(self, name: str):
        self.name = name

    def speak(self) -> str:
        return f"{self.name} says woof"
```

## Script entry point

```python
def main() -> None:
    ...

if __name__ == "__main__":
    main()
```
