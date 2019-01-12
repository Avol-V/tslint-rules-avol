import * as Lint from 'tslint';
import {
	isBlock,
	isCaseOrDefaultClause,
	isFunctionScopeBoundary,
	isIfStatement,
} from 'tsutils';
import * as Ts from 'typescript';
import getLinesCount from '../utils/getLinesCount';

/**
 * Rule options
 */
interface Options
{
	/**
	 * Number of lines of block operators to count statement as "large"
	 */
	'max-length': number;
	/**
	 * Ignore `if` statements within class constructors
	 */
	'ignore-constructor': boolean;
}

/**
 * Rule is recommends to use an early exit instead of a long `if` block
 */
class Rule extends Lint.Rules.AbstractRule
{
	/**
	 * Rule metadata
	 */
	public static metadata: Lint.IRuleMetadata = {
		ruleName: 'avol-early-exit',
		description: Lint.Utils.dedent`Rule is recommends to use an early exit \
			instead of a long \`if\` block`,
		options: {
			additionalProperties: false,
			type: 'object',
			properties: {
				'max-length': {
					type: 'number',
				},
				'ignore-constructor': {
					type: 'boolean',
				},
			},
		},
		optionsDescription: Lint.Utils.dedent`
			* \`max-length\` — Number of lines of block operators to count \
			  statement as "large"
			* \`ignore-constructor\` — Ignore \`if\` statements within class \
			  constructors
			`,
		type: 'maintainability',
		hasFix: false,
		typescriptOnly: false,
	};
	
	/**
	 * Apply linter to file
	 */
	public apply( sourceFile: Ts.SourceFile ): Lint.RuleFailure[]
	{
		const options: Options = {
			'max-length': 2,
			'ignore-constructor': false,
			...this.ruleArguments[0] as Options,
		};
		
		return this.applyWithFunction( sourceFile, walk, options );
	}
}

/**
 * Error message for `if` without `else`
 * 
 * @param exit Exit operator
 */
function failureString( exit: string ): string
{
	return `Remainder of block is inside 'if' statement. Prefer to invert the condition and '${exit}' early.`;
}

/**
 * Error message for `if` with `else`
 * 
 * @param exit Exit operator
 * @param branch `if` operator branch
 */
function failureStringSmall( exit: string, branch: 'else' | 'then' ): string
{
	return `'${branch}' branch is small; prefer an early '${exit}' to a full if-else.`;
}

/**
 * Error message for `"max-length": 0` mode
 * 
 * @param exit Exit operator
 */
function failureStringAlways( exit: string ): string
{
	return `Prefer an early '${exit}' to a full if-else.`;
}

/**
 * Rule walker
 */
function walk( ctx: Lint.WalkContext<Options> ): any
{
	const {
		sourceFile,
		options: {
			'max-length': maxLineLength,
			'ignore-constructor': ignoreConstructor,
		},
	} = ctx;
	
	const isSmall = ( length: number ) => length === 1;
	const isLarge = ( length: number ) => length > maxLineLength;
	
	const check = ( node: Ts.IfStatement ): void =>
	{
		const exit = getExit( node );
		
		if ( exit === undefined )
		{
			return;
		}
		
		const fail = ( failure: string ) =>
		{
			ctx.addFailureAt( node.getStart( sourceFile ), 2, failure );
		};
		
		const { thenStatement, elseStatement } = node;
		const thenSize = getNodeSize( thenStatement, sourceFile );
		
		if ( elseStatement === undefined )
		{
			if ( isLarge( thenSize ) )
			{
				fail( failureString( exit ) );
			}
			
			return;
		}
		
		// Never fail if there's an `else if`.
		if ( elseStatement.kind === Ts.SyntaxKind.IfStatement )
		{
			return;
		}
		
		if ( maxLineLength === 0 )
		{
			return fail( failureStringAlways( exit ) );
		}
		
		const elseSize = getNodeSize( elseStatement, sourceFile );
		
		if ( isSmall( thenSize ) && isLarge( elseSize ) )
		{
			fail( failureStringSmall( exit, 'then' ) );
		}
		else if ( isSmall( elseSize ) && isLarge( thenSize ) )
		{
			fail( failureStringSmall( exit, 'else' ) );
		}
	};
	
	const onNode = ( node: Ts.Node ): any =>
	{
		if (
			isIfStatement( node )
			&& (
				!ignoreConstructor
				|| !isConstructorClosestFunctionScopeBoundary( node )
			)
		)
		{
			check( node );
		}

		return Ts.forEachChild( node, onNode );
	};
	
	return Ts.forEachChild( sourceFile, onNode );
}

/**
 * Get node size (in operators for block, in lines otherwise)
 */
function getNodeSize( node: Ts.Node, sourceFile: Ts.SourceFile ): number
{
	return (
		isBlock( node )
		? node.statements.length
		: getLinesCount( node.getStart( sourceFile ), node.end, sourceFile )
	);
}

/**
 * Get exit operator for exit message
 */
function getExit( node: Ts.IfStatement ): string | undefined
{
	const parent = node.parent;
	
	if ( isBlock( parent ) )
	{
		const container = parent.parent;
		
		return (
			(
				isCaseOrDefaultClause( container )
				&& ( container.statements.length === 1 )
			)
			? getCaseClauseExit( container, parent, node )
			// Must be the last statement in the block
			: (
				isLastStatement( node, parent.statements )
				? getEarlyExitKind( container )
				: undefined
			)
		);
	}
	
	return (
		isCaseOrDefaultClause( parent )
		? getCaseClauseExit( parent, parent, node )
		// This is the only statement in its container, so of course it's the
		// final statement.
		: getEarlyExitKind( parent )
	);
}

/**
 * Get exit operator for `case` clause
 */
function getCaseClauseExit(
	clause: Ts.CaseOrDefaultClause,
	{ statements }: Ts.CaseOrDefaultClause | Ts.Block,
	node: Ts.IfStatement,
): string | undefined
{
	return (
		( statements[statements.length - 1].kind === Ts.SyntaxKind.BreakStatement )
		// Must be the last node before the break statement
		? (
			isLastStatement( node, statements, statements.length - 2 )
			? 'break'
			: undefined
		)
		// If no 'break' statement, this is a fallthrough, unless we're at the last clause.
		: (
			(
				( clause.parent.clauses[clause.parent.clauses.length - 1] === clause )
				&& isLastStatement( node, statements )
			)
			? 'break'
			: undefined
		)
	);
}

/**
 * Get exit operator for other cases
 */
function getEarlyExitKind( { kind }: Ts.Node ): string | undefined
{
	switch ( kind )
	{
		case Ts.SyntaxKind.FunctionDeclaration:
		case Ts.SyntaxKind.FunctionExpression:
		case Ts.SyntaxKind.ArrowFunction:
		case Ts.SyntaxKind.MethodDeclaration:
		case Ts.SyntaxKind.Constructor:
		case Ts.SyntaxKind.GetAccessor:
		case Ts.SyntaxKind.SetAccessor:
			return 'return';
		
		case Ts.SyntaxKind.ForInStatement:
		case Ts.SyntaxKind.ForOfStatement:
		case Ts.SyntaxKind.ForStatement:
		case Ts.SyntaxKind.WhileStatement:
		case Ts.SyntaxKind.DoStatement:
			return 'continue';
		
		default:
			// At any other location, we can't use an early exit.
			return;
	}
}

/**
 * Checks are `if` is last statement
 * 
 * @param ifStatement Current `if` statement
 * @param statements All sibling statements
 * @param fromIndex Start index (from end)
 */
function isLastStatement(
	ifStatement: Ts.IfStatement,
	statements: ReadonlyArray<Ts.Statement>,
	fromIndex: number = statements.length - 1,
): boolean
{
	let index: number = fromIndex;
	
	// tslint:disable-next-line:no-constant-condition
	while ( true )
	{
		const statement = statements[index];
		
		if ( statement === ifStatement )
		{
			return true;
		}
		
		if ( statement.kind !== Ts.SyntaxKind.FunctionDeclaration )
		{
			return false;
		}
		
		if ( index === 0 )
		{
			throw new Error( 'ifStatement should have been in statements' );
		}
		
		index--;
	}
}

/**
 * Checks is Node in `constructor` body
 */
function isConstructorClosestFunctionScopeBoundary( node: Ts.Node ): boolean
{
	let currentParent = node.parent;
	
	while ( currentParent )
	{
		if ( isFunctionScopeBoundary( currentParent ) )
		{
			return currentParent.kind === Ts.SyntaxKind.Constructor;
		}
		
		currentParent = currentParent.parent;
	}
	
	return false;
}

/**
 * Module
 */
export {
	Rule,
};
