# avol-binary-expression-parens

Rule to enforce the use of parentheses each operand of a binary expression when it is some kind of binary or conditional expression.

Kinds of binary expressions to enforce the use of parentheses:

* Bitwise operators
* Comparison Operators
* Logical Operators

Instead of:

```ts
if ( a && b == a || b ) {}
```

Prefer:

```ts
if ( ( a && b ) == ( a || b ) ) {}
```

A chain of the same operators are still allowed:

```ts
if ( a && b && ( a || b ) && !c ) {}
```

## Usage

```json
"avol-binary-expression-parens": true
```
