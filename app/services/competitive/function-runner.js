'use strict';
function wrap(content, metadata, extension) {
    if (!metadata || !/^[A-Za-z_]\w*$/.test(metadata.name) || !Array.isArray(metadata.params)) throw new Error('Unsupported function metadata.');
    const supported = type => typeof type === 'string' && /^(?:integer|int|long|double|boolean|string|character)(?:\[\])*$/.test(type);
    if (metadata.params.some(p => !supported(p.type)) || !supported(metadata.return?.type)) throw new Error('This problem needs a tree/list/design or void-return runner that is not supported yet. Run it on LeetCode.');
    if (extension === 'py') return 'from typing import *\nimport json, sys\n' + content + `\nif __name__ == '__main__':\n    args = json.loads(sys.stdin.read())\n    result = getattr(Solution(), ${JSON.stringify(metadata.name)})(*args)\n    print(json.dumps(result, separators=(',', ':'), ensure_ascii=False, allow_nan=False))\n`;
    if (extension !== 'cpp') throw new Error('Local LeetCode function tests currently support C++ and Python. Select one of these languages.');
    const types = { integer: 'long long', int: 'int', long: 'long long', double: 'double', boolean: 'bool', string: 'string', character: 'char' };
    function type(t) {
        if (t.endsWith('[]')) return `vector<${type(t.slice(0, -2))}>`;
        if (t === 'integer') return 'int';
        if (!types[t]) throw new Error('Local function runner does not support ' + t + ' yet.');
        return types[t];
    }
    return `#include <bits/stdc++.h>\nusing namespace std;\n
${require('./json-codec')}
${content}
int main(){try{skipSpace();if(cin.get()!='[')throw runtime_error("Expected JSON arguments");
${metadata.params.map((p,i)=>`${i ? 'skipSpace();if(cin.get()!=\',\')throw runtime_error("Expected comma");' : ''}${type(p.type)} a${i};readValue(a${i});`).join('\n')}
skipSpace();if(cin.get()!=']')throw runtime_error("Expected closing array");skipSpace();if(cin.peek()!=EOF)throw runtime_error("Trailing JSON data");
Solution solution; auto result=solution.${metadata.name}(${metadata.params.map((_,i)=>'a'+i).join(',')});writeValue(result);cout<<endl;
}catch(const exception& e){cerr<<e.what();return 1;}}
`;
}
module.exports = { wrap };
