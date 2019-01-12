# avol-conditional-expression-parens

*Based on `conditional-expression-parens` rule from [vrsource-tslint-rules](https://github.com/vrsource/vrsource-tslint-rules).  
Completely rewritten, fixed some false positives.*

Rule to enforce the use of parentheses each clause of a conditional when they are binary or conditional expression.

Instead of:

```ts
const x = b ? y + 10 : doSomething();
```

Prefer:

```ts
const x = b ? (y + 10) : doSomething();
```

## Usage

```json
"conditional-expression-parens": true
```
