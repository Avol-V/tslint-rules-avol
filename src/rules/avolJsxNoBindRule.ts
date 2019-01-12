import * as Lint from 'tslint';
import {
	isCallExpression,
	isJsxAttribute,
	isJsxExpression,
	isPropertyAccessExpression,
	isTypeNodeKind,
} from 'tsutils';
import * as Ts from 'typescript';

/**
 * Linting fail message
 */
const FAIL_MESSAGE = 'Binds are forbidden in JSX attributes due to their rendering performance impact';

/**
 * Forbids function binding in JSX attributes
 */
class Rule extends Lint.Rules.AbstractRule
{
	/**
	 * Rule metadata
	 */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'avol-jsx-no-bind',
		description: 'Forbids function binding in JSX attributes.',
		options: null,
		optionsDescription: '',
		type: 'functionality',
		hasFix: false,
		typescriptOnly: false,
	};
	
	/**
	 * Apply linter to file
	 */
	public apply( sourceFile: Ts.SourceFile ): Lint.RuleFailure[]
	{
		return this.applyWithFunction( sourceFile, walk );
	}
}

/**
 * Rule walker
 */
function walk( ctx: Lint.WalkContext<void> ): void
{
	const onNode = ( node: Ts.Node ): any =>
	{
		if ( isTypeNodeKind( node.kind ) )
		{
			return;
		}
		
		if ( !isJsxAttribute( node ) )
		{
			return Ts.forEachChild( node, onNode );
		}
		
		const initializer = node.initializer;
		
		if (
			!initializer
			|| !isJsxExpression( initializer )
		)
		{
			return;
		}
		
		const { expression } = initializer;
		
		if (
			!expression
			|| !isCallExpression( expression )
			|| !isThisBindExpression( expression )
		)
		{
			return;
		}
		
		return ctx.addFailureAtNode( expression, FAIL_MESSAGE );
	};
	
	return Ts.forEachChild( ctx.sourceFile, onNode );
}

/**
 * Check that call expression is bind to `this`
 */
function isThisBindExpression( node: Ts.CallExpression ): boolean
{
	const expression = node.expression;
	
	return (
		isPropertyAccessExpression( expression )
		&& ( expression.name.text === 'bind' )
		&& ( node.arguments.length === 1 )
		&& ( node.arguments[0].kind === Ts.SyntaxKind.ThisKeyword )
	);
}

/**
 * Module
 */
export {
	Rule,
};
