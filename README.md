[![NPM][npm]][npm-url]
[![Dependencies][deps]][deps-url]
[![DevDependencies][deps-dev]][deps-dev-url]

# tslint-rules-avol

[TSLint](https://github.com/palantir/tslint) rules for [Avol](https://github.com/Avol-V) codestyle.

## Rules

| Rule | Description |
| --- | --- |
| [avol-binary-expression-parens](docs/avol-binary-expression-parens.md) | Rule to enforce the use of parentheses each operand of a binary expression when it is some kind of binary or conditional expression. |
| [avol-conditional-expression-parens](docs/avol-conditional-expression-parens.md) | Rule to enforce the use of parentheses each clause of a conditional when they are binary or conditional expression. |
| [avol-early-exit](docs/avol-early-exit.md) | Recommends to use an early exit instead of a long `if` block. |
| [avol-jsx-no-bind](docs/avol-jsx-no-bind.md) | Forbids function binding in JSX attributes. |

## Change Log

[View changelog](CHANGELOG.md).

## License

[MIT](LICENSE).

[npm]: https://img.shields.io/npm/v/tslint-rules-avol.svg
[npm-url]: https://npmjs.com/package/tslint-rules-avol

[deps]: https://img.shields.io/david/Avol-V/tslint-rules-avol.svg
[deps-url]: https://david-dm.org/Avol-V/tslint-rules-avol

[deps-dev]: https://img.shields.io/david/dev/Avol-V/tslint-rules-avol.svg
[deps-dev-url]: https://david-dm.org/Avol-V/tslint-rules-avol?type=dev
