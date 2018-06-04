declare module 'parse-gitignore' {
    interface parsingOptions {
        cache?: boolean;
    }

    function parseGitIgnore(path: string, additionalPatterns?: string[], options?: parsingOptions): string[];
    export = parseGitIgnore;
}