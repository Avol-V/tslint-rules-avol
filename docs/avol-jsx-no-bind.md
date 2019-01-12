# avol-jsx-no-bind

*Based on `jsx-no-bind` rule from [tslint-react](https://github.com/palantir/tslint-react).  
Rule rewritten, fixed detection of `bind` call expression.*

Forbids function binding in JSX attributes.

Checks for calling `bind` method with single `this` attribute in JSX arguments.

```tsx
const myButton = (
	<button onClick={foo.bind(this)}>
		Button
	</button>
);
```

## Usage

```json
"avol-jsx-no-bind": true
```
