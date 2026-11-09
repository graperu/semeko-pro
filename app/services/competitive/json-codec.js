'use strict';
module.exports = String.raw`
void skipSpace(){while(cin.peek()!=EOF && isspace((unsigned char)cin.peek()))cin.get();}
void badJson(){throw runtime_error("Invalid JSON argument");}
void utf8(string& s,unsigned n){if(n<128)s+=char(n);else if(n<2048){s+=char(192|(n>>6));s+=char(128|(n&63));}else if(n<65536){s+=char(224|(n>>12));s+=char(128|((n>>6)&63));s+=char(128|(n&63));}else{s+=char(240|(n>>18));s+=char(128|((n>>12)&63));s+=char(128|((n>>6)&63));s+=char(128|(n&63));}}
unsigned hex4(){unsigned n=0;for(int i=0;i<4;i++){int c=cin.get();int d=c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:c>='A'&&c<='F'?c-'A'+10:-1;if(d<0)badJson();n=n*16+d;}return n;}
template<class T> void readValue(T& v);
void readValue(string& v){skipSpace();if(cin.get()!='"')badJson();v.clear();for(;;){int c=cin.get();if(c==EOF||c<32)badJson();if(c=='"')return;if(c!='\\'){v+=char(c);continue;}c=cin.get();switch(c){case '"':case '\\':case '/':v+=char(c);break;case 'b':v+='\b';break;case 'f':v+='\f';break;case 'n':v+='\n';break;case 'r':v+='\r';break;case 't':v+='\t';break;case 'u':{unsigned n=hex4();if(n>=0xd800&&n<=0xdbff){if(cin.get()!='\\'||cin.get()!='u')badJson();unsigned lo=hex4();if(lo<0xdc00||lo>0xdfff)badJson();n=0x10000+((n-0xd800)<<10)+(lo-0xdc00);}else if(n>=0xdc00&&n<=0xdfff)badJson();utf8(v,n);break;}default:badJson();}}}
void readValue(bool& v){skipSpace();string s;while(cin.peek()!=EOF&&isalpha(cin.peek()))s+=char(cin.get());if(s!="true"&&s!="false")badJson();v=s=="true";}
void readValue(char& v){string s;readValue(s);if(s.size()!=1)badJson();v=s[0];}
template<class T> void readValue(vector<T>& v){skipSpace();if(cin.get()!='[')badJson();skipSpace();if(cin.peek()==']'){cin.get();return;}for(;;){T x;readValue(x);v.push_back(x);skipSpace();int c=cin.get();if(c==']')return;if(c!=',')badJson();}}
template<class T> void readValue(T& v){skipSpace();string s;while(cin.peek()!=EOF&&!isspace(cin.peek())&&cin.peek()!=','&&cin.peek()!=']')s+=char(cin.get());static const regex number(R"(-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?)");if(!regex_match(s,number))badJson();istringstream in(s);if(!(in>>v)||in.peek()!=EOF)badJson();}
void writeValue(const string& s){cout<<'"';for(unsigned char c:s){switch(c){case '"':cout<<"\\\"";break;case '\\':cout<<"\\\\";break;case '\n':cout<<"\\n";break;case '\r':cout<<"\\r";break;case '\t':cout<<"\\t";break;default:if(c<32){const char* h="0123456789abcdef";cout<<"\\u00"<<h[c>>4]<<h[c&15];}else cout<<c;}}cout<<'"';}
void writeValue(char v){writeValue(string(1,v));}void writeValue(bool v){cout<<(v?"true":"false");}
template<class T> void writeValue(const T& v){if constexpr(is_floating_point_v<T>){if(!isfinite(v))badJson();cout<<setprecision(numeric_limits<T>::max_digits10);}cout<<v;}
template<class T> void writeValue(const vector<T>& v){cout<<'[';for(size_t i=0;i<v.size();i++){if(i)cout<<',';T x=v[i];writeValue(x);}cout<<']';}
`;
