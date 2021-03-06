import * as Lint from 'tslint';
import {
	isInterfaceDeclaration,
	isNamedExports,
	isNamedImports,
	isObjectBindingPattern,
	isObjectLiteralExpression,
	isTypeLiteralNode,
	isTypeNodeKind,
} from 'tsutils';
import * as Ts from 'typescript';
import getLinesCount from '../utils/getLinesCount';

/**
 * Rule options
 */
interface Options
{
	/**
	 * `const o = {};`
	 */
	ObjectLiteral?: NormalizedExpressionOptions;
	/**
	 * `type T = {};`
	 */
	TypeLiteral?: NormalizedExpressionOptions;
	/**
	 * `interface T {}`
	 */
	InterfaceDeclaration?: NormalizedExpressionOptions;
	/**
	 * `const {} = o;`  
	 * `function f( {} ) {}`
	 */
	ObjectDestructuring?: NormalizedExpressionOptions;
	/**
	 * `import {} from 'm';`
	 */
	Imports?: NormalizedExpressionOptions;
	/**
	 * `export {};`
	 */
	Exports?: NormalizedExpressionOptions;
}

/**
 * Expression options
 */
interface ExpressionOptions
{
	allowAllPropertiesOnSameLine: boolean | number;
	onlyShorthands: boolean;
	allowSpread: boolean;
}

/**
 * Normalized expression options
 */
interface NormalizedExpressionOptions extends ExpressionOptions
{
	allowAllPropertiesOnSameLine: number;
}

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
		ruleName: 'avol-object-property-newline',
		description: 'Enforce placing object properties on separate lines.',
		options: null, // TODO: Описать
		optionsDescription: '',
		type: 'style',
		hasFix: false,
		typescriptOnly: false,
	};
	
	/**
	 * Apply linter to file
	 */
	public apply( sourceFile: Ts.SourceFile ): Lint.RuleFailure[]
	{
		const userOptions = ( this.ruleArguments[0] || {} ) as (
			Options & ExpressionOptions
		);
		const defaults: NormalizedExpressionOptions = {
			allowAllPropertiesOnSameLine: convertBooleanToNumber(
				userOptions.allowAllPropertiesOnSameLine,
			),
			onlyShorthands: Boolean( userOptions.onlyShorthands ),
			allowSpread: (
				( userOptions.allowSpread === undefined )
				? true
				: Boolean( userOptions.allowSpread )
			),
		};
		const noShorthands: Partial<NormalizedExpressionOptions> = {
			onlyShorthands: false,
			allowSpread: false,
		};
		const noSpread: Partial<NormalizedExpressionOptions> = {
			allowSpread: false,
		};
		
		const options: Options = {
			ObjectLiteral: (
				!userOptions.ObjectLiteral
				? defaults
				: getExpressionOptions( defaults, userOptions.ObjectLiteral )
			),
			TypeLiteral: getExpressionOptions( defaults, userOptions.TypeLiteral, noShorthands ),
			InterfaceDeclaration: getExpressionOptions( defaults, userOptions.InterfaceDeclaration, noShorthands ),
			ObjectDestructuring: getExpressionOptions( defaults, userOptions.ObjectDestructuring ),
			Imports: getExpressionOptions( defaults, userOptions.Imports, noSpread ),
			Exports: getExpressionOptions( defaults, userOptions.Exports, noSpread ),
		};
		
		return this.applyWithFunction( sourceFile, walk, options );
	}
}

/**
 * Rule walker
 */
function walk( ctx: Lint.WalkContext<Options> ): void
{
	const options = ctx.options;
	
	const typesChecked = Boolean(
		options.TypeLiteral || options.InterfaceDeclaration,
	);
	
	const onNode = ( node: Ts.Node ): any =>
	{
		if ( !typesChecked && isTypeNodeKind( node.kind ) )
		{
			return;
		}
		
		if ( isCheckableNode( node, options ) )
		{
			checkNode( node, ctx );
		}
		
		return Ts.forEachChild( node, onNode );
	};
	
	return Ts.forEachChild( ctx.sourceFile, onNode );
}

/**
 * Check current node
 * 
 * @param node Current node
 * @param ctx Walk context
 */
function checkNode(
	node: Ts.Node,
	ctx: Lint.WalkContext<Options>,
): void
{
	const elements = getNodeElements( node );
	const elementsCount = elements.length;
	
	if ( elementsCount < 2 )
	{
		return;
	}
	
	const {
		options,
		sourceFile,
	} = ctx;
	
	const nodeOptions = getOptionsForNode( node, options );
	const {
		allowAllPropertiesOnSameLine,
		onlyShorthands,
		allowSpread,
	} = nodeOptions;
	
	if (
		( allowAllPropertiesOnSameLine >= elementsCount )
		&& (
			!onlyShorthands
			|| elements.every(
				( element ) => (
					isShorthand( element )
					|| ( allowSpread && isSpread( element ) )
				),
			)
		)
		&& isAllPropertiesOnSameLine( elements, sourceFile )
	)
	{
		return;
	}
	
	for ( let i = 1, n = elements.length; i < n; i++ )
	{
		const previousProperty = elements[i - 1];
		const currentProperty = elements[i];
		
		if (
			getLinesCount(
				previousProperty.end,
				currentProperty.getStart( sourceFile ),
				sourceFile,
			)
			=== 1
		)
		{
			ctx.addFailureAtNode(
				currentProperty,
				getErrorMessage( nodeOptions ),
			);
		}
	}
}

/**
 * Is all properties in the object on the same line?
 * 
 * @param properties Object properties
 * @param sourceFile Source file
 */
function isAllPropertiesOnSameLine(
	properties: Ts.NodeArray<Ts.Node>,
	sourceFile: Ts.SourceFile,
): boolean
{
	const firstProperty = properties[0];
	const lastProperty = properties[properties.length - 1];
	
	return (
		getLinesCount(
			firstProperty.getStart( sourceFile ),
			lastProperty.end,
			sourceFile,
		)
		=== 1
	);
}

/**
 * Get options for node type
 * 
 * @param node Current node
 * @param options Rule options
 */
function getOptionsForNode(
	node: Ts.Node,
	options: Options,
): NormalizedExpressionOptions
{
	const defaults: NormalizedExpressionOptions = {
		allowAllPropertiesOnSameLine: 0,
		onlyShorthands: false,
		allowSpread: true,
	};
	
	switch ( node.kind )
	{
		case Ts.SyntaxKind.ObjectLiteralExpression:
			return options.ObjectLiteral || defaults;
		
		case Ts.SyntaxKind.TypeLiteral:
			return options.TypeLiteral || defaults;
		
		case Ts.SyntaxKind.InterfaceDeclaration:
			return options.InterfaceDeclaration || defaults;
		
		case Ts.SyntaxKind.ObjectBindingPattern:
			return options.ObjectDestructuring || defaults;
		
		case Ts.SyntaxKind.NamedImports:
			return options.Imports || defaults;
		
		case Ts.SyntaxKind.NamedExports:
			return options.Exports || defaults;
		
		default:
			return defaults;
	}
}

/**
 * Get elements or properties from node
 * 
 * @param node Current node
 * @param options Rule options
 */
function getNodeElements(
	node: Ts.Node,
): Ts.NodeArray<Ts.Node>
{
	switch ( node.kind )
	{
		case Ts.SyntaxKind.ObjectLiteralExpression:
			return ( node as Ts.ObjectLiteralExpression ).properties;
		
		case Ts.SyntaxKind.TypeLiteral:
			return ( node as Ts.TypeLiteralNode ).members;
		
		case Ts.SyntaxKind.InterfaceDeclaration:
			return ( node as Ts.InterfaceDeclaration ).members;
		
		case Ts.SyntaxKind.ObjectBindingPattern:
			return ( node as Ts.ObjectBindingPattern ).elements;
		
		case Ts.SyntaxKind.NamedImports:
			return ( node as Ts.NamedImports ).elements;
		
		case Ts.SyntaxKind.NamedExports:
			return ( node as Ts.NamedExports ).elements;
		
		default:
			return Ts.createNodeArray();
	}
}

/**
 * Get expression options
 * 
 * @param defaults Default options
 * @param options Expression options
 * @param overwrite Overwrite these options
 */
function getExpressionOptions(
	defaults: NormalizedExpressionOptions,
	options: ExpressionOptions | boolean | undefined,
	overwrite: Partial<NormalizedExpressionOptions> = {},
): NormalizedExpressionOptions | undefined
{
	if ( options === true )
	{
		return { ...defaults };
	}
	
	if ( !options || ( typeof options !== 'object' ) )
	{
		return;
	}
	
	const current = {
		...defaults,
		...options,
	};
	const extra: Partial<NormalizedExpressionOptions> = {};
	
	if (
		current.onlyShorthands
		&& ( overwrite.onlyShorthands === false )
	)
	{
		extra.allowAllPropertiesOnSameLine = 0;
	}
	
	const result = {
		...current,
		...overwrite,
		...extra,
	};
	
	return {
		...result,
		allowAllPropertiesOnSameLine: convertBooleanToNumber(
			result.allowAllPropertiesOnSameLine,
		),
	};
}

/**
 * Is we should check current node?
 * 
 * @param node Current node
 * @param options Rule options
 */
function isCheckableNode( node: Ts.Node, options: Options ): node is (
	Ts.ObjectLiteralExpression
	| Ts.TypeLiteralNode
	| Ts.InterfaceDeclaration
	| Ts.ObjectBindingPattern
	| Ts.NamedImports
	| Ts.NamedExports
)
{
	return Boolean(
		( options.ObjectLiteral && isObjectLiteralExpression( node ) )
		|| ( options.TypeLiteral && isTypeLiteralNode( node ) )
		|| ( options.InterfaceDeclaration && isInterfaceDeclaration( node ) )
		|| ( options.ObjectDestructuring && isObjectBindingPattern( node ) )
		|| ( options.Imports && isNamedImports( node ) )
		|| ( options.Exports && isNamedExports( node ) ),
	);
}

/**
 * Is element node a shorthand property?
 * 
 * @param node Element node
 */
function isShorthand( node: Ts.Node ): boolean
{
	return (
		( node.kind === Ts.SyntaxKind.ShorthandPropertyAssignment )
		|| (
			[
				Ts.SyntaxKind.BindingElement,
				Ts.SyntaxKind.ImportSpecifier,
				Ts.SyntaxKind.ExportSpecifier,
			].includes( node.kind )
			&& !(
				node as ( Ts.BindingElement | Ts.ImportSpecifier | Ts.ExportSpecifier )
			).propertyName
			&& !( node as Ts.BindingElement ).dotDotDotToken
		)
	);
}

/**
 * Is element node a spread expression?
 * 
 * @param node Element node
 */
function isSpread( node: Ts.Node ): boolean
{
	return (
		( node.kind === Ts.SyntaxKind.SpreadAssignment )
		|| (
			( node.kind === Ts.SyntaxKind.BindingElement )
			&& ( ( node as Ts.BindingElement ).dotDotDotToken != null )
		)
	);
}

/**
 * Convert boolean option value to number
 * 
 * @param value Options value
 */
function convertBooleanToNumber( value?: boolean | number ): number
{
	return (
		( typeof value === 'boolean' )
		? ( value ? Number.MAX_VALUE : 0 )
		: ( value || 0 )
	);
}

/**
 * Get error message
 * 
 * @param options Expression options
 */
function getErrorMessage( options: NormalizedExpressionOptions ): string
{
	if ( options.allowAllPropertiesOnSameLine )
	{
		if ( options.onlyShorthands )
		{
			const orSpread = (
				options.allowSpread
				? ' or spread'
				: ''
			);
			
			return (
				( options.allowAllPropertiesOnSameLine >= Number.MAX_VALUE )
				? `Object properties must go on a new line if they aren't all shorthands${
					orSpread
				} on the same line`
				: `Object properties must go on a new line if they aren't all shorthands${
					orSpread
				} and there are more than ${
					options.allowAllPropertiesOnSameLine
				} properties`
			);
		}
		
		return (
			( options.allowAllPropertiesOnSameLine >= Number.MAX_VALUE )
			? 'Object properties must go on a new line if they aren\'t all on the same line'
			: `Object properties must go on a new line if there are more than ${
				options.allowAllPropertiesOnSameLine
			} properties`
		);
	}
	
	return 'Object properties must go on a new line';
}

/**
 * Module
 */
export {
	Rule,
};
