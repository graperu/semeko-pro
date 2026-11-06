'use strict';

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const starters = {
    cpp: ['C++', 'main.cpp', '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n'],
    c: ['C', 'main.c', '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}\n'],
    py: ['Python', 'main.py', 'def main():\n    print("Hello, world!")\n\n\nif __name__ == "__main__":\n    main()\n'],
    java: ['Java', 'Main.java', 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n'],
    cs: ['CSharp', 'Program.cs', 'using System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        Console.WriteLine("Hello, world!");\n    }\n}\n']
};

async function open(extension) {
    if (!Object.hasOwn(starters, extension)) throw new Error('Unsupported workspace language.');
    const [name, file, content] = starters[extension];
    const folder = path.join(app.getPath('userData'), 'Workspaces', name);
    await fs.mkdir(folder, { recursive: true });
    const entry = path.join(folder, file);
    // Switching back to a language must never replace the user's program.
    try { await fs.writeFile(entry, content, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    return { ok: true, folder, entry, extension };
}

module.exports = { open };
