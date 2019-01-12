import * as Lint from 'tslint';
import {
	isBinaryExpression,
	isTypeNodeKind,
} from 'tsutils';
import * as Ts from 'typescript';

/**
 * Linting fail message
 */
const FAIL_MESSAGE = 'Expression clause must be parenthesized';

/**
 * Disallowed clauses in Binary Expression
 */
const disallowedClauseKinds = new Set( [
	Ts.SyntaxKind.BinaryExpression,
	Ts.SyntaxKind.ConditionalExpression,
] );

/**
 * Kinds of binary expression operators to enforce the use of parentheses
 */
const checkableOperatorTokens = new Set( [
	Ts.SyntaxKind.AmpersandAmpersandToken,
	Ts.SyntaxKind.AmpersandToken,
	Ts.SyntaxKind.BarBarToken,
	Ts.SyntaxKind.BarToken,
	Ts.SyntaxKind.CaretToken,
	Ts.SyntaxKind.EqualsEqualsEqualsToken,
	Ts.SyntaxKind.EqualsEqualsToken,
	Ts.SyntaxKind.ExclamationEqualsEqualsToken,
	Ts.SyntaxKind.ExclamationEqualsToken,
	Ts.SyntaxKind.GreaterThanEqualsToken,
	Ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
	Ts.SyntaxKind.GreaterThanGreaterThanToken,
	Ts.SyntaxKind.GreaterThanToken,
	Ts.SyntaxKind.LessThanEqualsToken,
	Ts.SyntaxKind.LessThanLessThanToken,
	Ts.SyntaxKind.LessThanToken,
] );

/**
 * Rule to enforce the use of parentheses each operand of a binary expression
 * when they are some kind of binary or conditional expression.
 */
class Rule extends Lint.Rules.AbstractRule
{
	/**
	 * Rule metadata
	 */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'avol-binary-expression-parens',
		description: Lint.Utils.dedent`Rule to enforce the use of parentheses \
			each operand of a binary expression when it is some kind of binary \
			or conditional expression.`,
		options: null,
		optionsDescription: '',
		type: 'maintainability',
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
		
		if (
			!isBinaryExpression( node )
			|| !checkableOperatorTokens.has( node.operatorToken.kind )
		)
		{
			return Ts.forEachChild( node, onNode );
		}
		
		const clauses = [node.left, node.right];
		
		for ( const clause of clauses )
		{
			if (
				disallowedClauseKinds.has( clause.kind )
				&& (
					!isBinaryExpression( clause )
					|| ( clause.operatorToken.kind !== node.operatorToken.kind )
				)
			)
			{
				ctx.addFailureAtNode( clause, FAIL_MESSAGE );
			}
		}
		
		return Ts.forEachChild( node, onNode );
	};
	
	return Ts.forEachChild( ctx.sourceFile, onNode );
}

/**
 * Module
 */
export {
	Rule,
};
