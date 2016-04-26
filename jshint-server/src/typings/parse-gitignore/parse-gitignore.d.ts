declare module 'parse-gitignore' {
    function parseGitIgnore(path: string): string[];
    export = parseGitIgnore;
}