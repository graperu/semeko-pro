'use strict';
function wrap(content, metadata, extension) {
    if (!metadata || !/^[A-Za-z_]\w*$/.test(metadata.name) || !Array.isArray(metadata.params)) throw new Error('Unsupported function metadata.');
    const supported = type => typeof type === 'string' && /^(?:integer|int|long|double|boolean|string|character)(?:\[\])*$/.test(type);
    if (metadata.params.some(p => !supported(p.type)) || !supported(metadata.return?.type)) throw new Error('This problem needs a tree/list/design or void-return runner that is not supported yet. Run it on LeetCode.');
    if (extension === 'py') return 'from typing import *\nimport json, sys\n' + content + `\nif __name__ == '__main__':\n    args = json.loads(sys.stdin.read())\n    result = getattr(Solution(), ${JSON.stringify(metadata.name)})(*args)\n    print(json.dumps(result, separators=(',', ':')))\n`;
    if (extension !== 'cpp') throw new Error('Local LeetCode function tests currently support C++ and Python. Select one of these languages.');
    const types = { integer: 'long long', int: 'int', long: 'long long', double: 'double', boolean: 'bool', string: 'string', character: 'char' };
    function type(t) {
        if (t.endsWith('[]')) return `vector<${type(t.slice(0, -2))}>`;
        if (t === 'integer') return 'int';
        if (!types[t]) throw new Error('Local function runner does not support ' + t + ' yet.');
        return types[t];
    }
    return `#include <bits/stdc++.h>\nusing namespace std;\n
void skipSpace(){while(isspace(cin.peek()))cin.get();}
template<class T> void readValue(T& v);
void readValue(string& v){skipSpace();cin>>quoted(v);}
void readValue(bool& v){skipSpace();string s;while(isalpha(cin.peek()))s+=char(cin.get());if(s!="true"&&s!="false")throw runtime_error("Invalid boolean");v=s=="true";}
void readValue(char& v){string s;readValue(s);if(s.size()!=1)throw runtime_error("Invalid character");v=s[0];}
template<class T> void readValue(vector<T>& v){skipSpace();if(cin.get()!='[')throw runtime_error("Expected array");skipSpace();while(cin.peek()!=']'){T x;readValue(x);v.push_back(x);skipSpace();if(cin.peek()==',')cin.get();else if(cin.peek()!=']')throw runtime_error("Invalid array");}cin.get();}
template<class T> void readValue(T& v){skipSpace();if(!(cin>>v))throw runtime_error("Invalid argument");}
void writeValue(const string& v){cout<<quoted(v);} void writeValue(char v){writeValue(string(1,v));} void writeValue(bool v){cout<<(v?"true":"false");}
template<class T> void writeValue(const T& v){cout<<v;}
template<class T> void writeValue(const vector<T>& v){cout<<'[';for(size_t i=0;i<v.size();i++){if(i)cout<<',';writeValue(v[i]);}cout<<']';}
${content}
int main(){try{skipSpace();if(cin.get()!='[')throw runtime_error("Expected JSON arguments");
${metadata.params.map((p,i)=>`${i ? 'skipSpace();if(cin.get()!=\',\')throw runtime_error("Expected comma");' : ''}${type(p.type)} a${i};readValue(a${i});`).join('\n')}
Solution solution; auto result=solution.${metadata.name}(${metadata.params.map((_,i)=>'a'+i).join(',')});writeValue(result);cout<<endl;
}catch(const exception& e){cerr<<e.what();return 1;}}
`;
}
module.exports = { wrap };
