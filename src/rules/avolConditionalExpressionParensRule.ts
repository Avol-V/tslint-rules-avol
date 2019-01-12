import * as Lint from 'tslint';
import {
	isConditionalExpression,
	isTypeNodeKind,
} from 'tsutils';
import * as Ts from 'typescript';

/**
 * Linting fail message
 */
const FAIL_MESSAGE = 'Expression clause must be parenthesized';

/**
 * Disallowed clauses in Conditional Expression
 */
const disallowedClauseKinds = new Set( [
	Ts.SyntaxKind.BinaryExpression,
	Ts.SyntaxKind.ConditionalExpression,
] );

/**
 * Rule to enforce the use of parentheses each clause of a conditional when they
 * are binary or conditional expression.
 */
class Rule extends Lint.Rules.AbstractRule
{
	/**
	 * Rule metadata
	 */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'avol-conditional-expression-parens',
		description: Lint.Utils.dedent`Rule to enforce the use of parentheses \
			each clause of a conditional when they are binary or conditional \
			expression.`,
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
		
		if ( !isConditionalExpression( node ) )
		{
			return Ts.forEachChild( node, onNode );
		}
		
		const clauses = [node.condition, node.whenFalse, node.whenTrue];
		
		for ( const clause of clauses )
		{
			if ( disallowedClauseKinds.has( clause.kind ) )
			{
				ctx.addFailureAtNode( clause, FAIL_MESSAGE );
			}
		}
	};
	
	return Ts.forEachChild( ctx.sourceFile, onNode );
}

/**
 * Module
 */
export {
	Rule,
};
