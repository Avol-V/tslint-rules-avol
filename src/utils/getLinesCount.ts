import * as Ts from 'typescript';

/**
 * Get lines count in file
 * 
 * @param start Start position in file
 * @param end End position in file
 * @param sourceFile Source file
 */
function getLinesCount(
	start: number,
	end: number,
	sourceFile: Ts.SourceFile,
): number
{
	return Ts.getLineAndCharacterOfPosition( sourceFile, end ).line
		- Ts.getLineAndCharacterOfPosition( sourceFile, start ).line
		+ 1;
}

/**
 * Module
 */
export {
	getLinesCount as default,
};
