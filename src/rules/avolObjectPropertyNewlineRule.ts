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
	ObjectLiteral?: NormalizedExpressionOptions;
	TypeLiteral?: NormalizedExpressionOptions;
	InterfaceDeclaration?: NormalizedExpressionOptions;
	ObjectDestructuring?: NormalizedExpressionOptions;
	Imports?: NormalizedExpressionOptions;
	Exports?: NormalizedExpressionOptions;
	// TODO: Деструктуризация аргумента
}

/**
 * Expression options
 */
interface ExpressionOptions
{
	allowAllPropertiesOnSameLine: boolean | number;
	allowAllShorthands: boolean | number;
}

/**
 * Normalized expression options
 */
interface NormalizedExpressionOptions
{
	allowAllPropertiesOnSameLine: number;
	allowAllShorthands: number;
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
			allowAllShorthands: convertBooleanToNumber(
				userOptions.allowAllShorthands,
			),
		};
		const noShorthands: Partial<NormalizedExpressionOptions> = {
			allowAllShorthands: 0,
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
			Imports: getExpressionOptions( defaults, userOptions.Imports ),
			Exports: getExpressionOptions( defaults, userOptions.Exports ),
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
		allowAllShorthands,
	} = nodeOptions;
	
	if (
		(
			( allowAllPropertiesOnSameLine >= elementsCount )
			|| (
				( allowAllShorthands >= elementsCount )
				&& elements.every( isShorthand )
				// TODO: { k1, k2, ...{} }
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
		allowAllShorthands: 0,
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
	
	const result = {
		...defaults,
		...options,
		...overwrite,
	};
	
	return {
		...result,
		allowAllPropertiesOnSameLine: convertBooleanToNumber(
			result.allowAllPropertiesOnSameLine,
		),
		allowAllShorthands: convertBooleanToNumber(
			result.allowAllShorthands,
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
		return (
			( options.allowAllPropertiesOnSameLine >= Number.MAX_VALUE )
			? 'Object properties must go on a new line if they aren\'t all on the same line'
			: `Object properties must go on a new line if there are more than ${
				options.allowAllPropertiesOnSameLine
			} properties`
		);
	}
	
	if ( options.allowAllShorthands )
	{
		return (
			( options.allowAllShorthands >= Number.MAX_VALUE )
			? 'Object properties must go on a new line if they aren\'t all shorthands on the same line'
			: `Object properties must go on a new line if they aren't all shorthands and there are more than ${
				options.allowAllShorthands
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
