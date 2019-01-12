import * as Lint from 'tslint';
import {
	isObjectLiteralExpression,
	isTypeNodeKind,
} from 'tsutils';
import * as Ts from 'typescript';
import getLinesCount from '../utils/getLinesCount';

/**
 * Rule options
 */
interface Options
{
	allowAllPropertiesOnSameLine: boolean;
}

/**
 * Linting fail message
 */
const FAIL_MESSAGE = 'Object properties must go on a new line';
/**
 * Linting fail message for `allowAllPropertiesOnSameLine` mode
 */
const FAIL_MESSAGE_ALLOW_ALL = 'Object properties must go on a new line if they aren\'t all on the same line';

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
		const options: Options = {
			allowAllPropertiesOnSameLine: false,
			...this.ruleArguments[0] as Options,
		};
		
		return this.applyWithFunction( sourceFile, walk, options );
	}
}

/**
 * Rule walker
 */
function walk( ctx: Lint.WalkContext<Options> ): void
{
	const onNode = ( node: Ts.Node ): any =>
	{
		if ( isTypeNodeKind( node.kind ) )
		{
			return;
		}
		
		if ( !isObjectLiteralExpression( node ) )
		{
			return Ts.forEachChild( node, onNode );
		}
		
		const {
			sourceFile,
			options: {
				allowAllPropertiesOnSameLine,
			},
		} = ctx;
		
		const errorMessage = (
			allowAllPropertiesOnSameLine
			? FAIL_MESSAGE_ALLOW_ALL
			: FAIL_MESSAGE
		);
		
		if (
			allowAllPropertiesOnSameLine
			&& ( node.properties.length > 1 )
			&& isAllPropertiesOnSameLine( node.properties, sourceFile )
		)
		{
			// All keys and values are on the same line
			return;
		}
		
		for ( let i = 1, n = node.properties.length; i < n; i++ )
		{
			const previousProperty = node.properties[i - 1];
			const currentProperty = node.properties[i];
			
			if (
				getLinesCount(
					previousProperty.end,
					currentProperty.getStart( sourceFile ),
					sourceFile,
				)
				=== 1
			)
			{
				ctx.addFailureAtNode( currentProperty, errorMessage );
			}
		}
		
		return Ts.forEachChild( node, onNode );
	};
	
	return Ts.forEachChild( ctx.sourceFile, onNode );
}

/**
 * Is all properties in the object on the same line?
 * 
 * @param properties Object properties
 * @param sourceFile Source file
 */
function isAllPropertiesOnSameLine(
	properties: Ts.NodeArray<Ts.ObjectLiteralElementLike>,
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
 * Module
 */
export {
	Rule,
};
