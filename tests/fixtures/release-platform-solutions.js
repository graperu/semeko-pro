'use strict';
const cf={
 '455-A':'int n;cin>>n;vector<long long>a(100001);int m=0;while(n--){int x;cin>>x;a[x]+=x;m=max(m,x);}long long p=0,q=0;for(int i=1;i<=m;i++){long long r=max(q,p+a[i]);p=q;q=r;}cout<<q;',
 '189-A':'int n,a,b,c;cin>>n>>a>>b>>c;vector<int>d(n+1,-10000);d[0]=0;for(int i=1;i<=n;i++)for(int x:{a,b,c})if(x<=i)d[i]=max(d[i],d[i-x]+1);cout<<d[n];',
 '313-B':'string s;cin>>s;vector<int>p(s.size());for(int i=1;i<s.size();i++)p[i]=p[i-1]+(s[i]==s[i-1]);int q;cin>>q;while(q--){int l,r;cin>>l>>r;cout<<p[r-1]-p[l-1]<<"\\n";}',
 '474-D':'int t,k;cin>>t>>k;const int M=1000000007;vector<int>d(100001),p(100001);d[0]=1;for(int i=1;i<=100000;i++){d[i]=d[i-1];if(i>=k)d[i]=(d[i]+d[i-k])%M;p[i]=(p[i-1]+d[i])%M;}while(t--){int a,b;cin>>a>>b;cout<<(p[b]-p[a-1]+M)%M<<"\\n";}',
 '520-B':'int n,m;cin>>n>>m;int c=0;while(m>n){if(m&1)m++;else m/=2;c++;}cout<<c+n-m;',
 '545-C':'int n;cin>>n;vector<long long>x(n),h(n);for(int i=0;i<n;i++)cin>>x[i]>>h[i];if(n==1){cout<<1;return 0;}int ans=2;long long last=x[0];for(int i=1;i<n-1;i++){if(x[i]-h[i]>last){ans++;last=x[i];}else if(x[i]+h[i]<x[i+1]){ans++;last=x[i]+h[i];}else last=x[i];}cout<<ans;',
 '580-C':'int n,m;cin>>n>>m;vector<int>a(n);for(int&v:a)cin>>v;vector<vector<int>>g(n);for(int i=1,u,v;i<n;i++){cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}int ans=0;vector<array<int,3>>st={{0,-1,0}};while(!st.empty()){auto [u,p,c]=st.back();st.pop_back();c=a[u]?c+1:0;if(c>m)continue;bool leaf=true;for(int v:g[u])if(v!=p){leaf=false;st.push_back({v,u,c});}if(leaf)ans++;}cout<<ans;',
 '706-C':'int n;cin>>n;vector<long long>c(n);for(auto&v:c)cin>>v;vector<string>a(n),b(n);for(int i=0;i<n;i++){cin>>a[i];b[i]=a[i];reverse(b[i].begin(),b[i].end());}const long long INF=4e18;long long p=0,q=c[0];for(int i=1;i<n;i++){long long r=INF,s=INF;if(a[i]>=a[i-1])r=min(r,p);if(a[i]>=b[i-1])r=min(r,q);if(b[i]>=a[i-1])s=min(s,p+c[i]);if(b[i]>=b[i-1])s=min(s,q+c[i]);p=r;q=s;}cout<<(min(p,q)>=INF?-1:min(p,q));',
 '1201-C':'int n;long long k;cin>>n>>k;vector<long long>a(n);for(auto&v:a)cin>>v;sort(a.begin(),a.end());int mid=n/2;long long lo=a[mid],hi=lo+k+1;while(hi-lo>1){long long v=(lo+hi)/2,s=0;for(int i=mid;i<n;i++)if(a[i]<v){s+=v-a[i];if(s>k)break;}if(s<=k)lo=v;else hi=v;}cout<<lo;',
 '1352-C':'int t;cin>>t;while(t--){long long n,k;cin>>n>>k;cout<<k+(k-1)/(n-1)<<"\\n";}',
 '230-B':'int n;cin>>n;vector<bool>p(1000001,true);p[0]=p[1]=false;for(int i=2;i*i<=1000000;i++)if(p[i])for(int j=i*i;j<=1000000;j+=i)p[j]=false;while(n--){long long x;cin>>x;long long r=sqrtl(x);cout<<(r*r==x&&r<=1000000&&p[r]?"YES":"NO")<<"\\n";}',
 '451-B':'int n;cin>>n;vector<int>a(n),b;for(int&v:a)cin>>v;b=a;sort(b.begin(),b.end());int l=0,r=n-1;while(l<n&&a[l]==b[l])l++;while(r>=0&&a[r]==b[r])r--;if(l==n){cout<<"yes\\n1 1";return 0;}reverse(a.begin()+l,a.begin()+r+1);if(a==b)cout<<"yes\\n"<<l+1<<" "<<r+1;else cout<<"no";',
 '160-A':'int n;cin>>n;vector<int>a(n);int s=0;for(int&v:a){cin>>v;s+=v;}sort(a.rbegin(),a.rend());int x=0,k=0;while(x<=s-x)x+=a[k++];cout<<k;',
 '977-C':'int n,k;cin>>n>>k;vector<int>a(n);for(int&v:a)cin>>v;sort(a.begin(),a.end());if(k==0)cout<<(a[0]>1?1:-1);else if(k==n||a[k-1]<a[k])cout<<a[k-1];else cout<<-1;',
 '96-A':'string s;cin>>s;cout<<(s.find("0000000")!=string::npos||s.find("1111111")!=string::npos?"YES":"NO");'
};
const lc={
 'house-robber':'int rob(vector<int>&a){int p=0,q=0;for(int x:a){int r=max(q,p+x);p=q;q=r;}return q;}',
 'maximum-subarray':'int maxSubArray(vector<int>&a){int ans=a[0],s=0;for(int x:a){s=max(x,s+x);ans=max(ans,s);}return ans;}',
 'unique-paths':'int uniquePaths(int m,int n){vector<int>d(n,1);while(--m)for(int j=1;j<n;j++)d[j]+=d[j-1];return d.back();}',
 'minimum-path-sum':'int minPathSum(vector<vector<int>>&a){int m=a.size(),n=a[0].size();vector<int>d(n,1000000000);d[0]=0;for(auto&r:a)for(int j=0;j<n;j++)d[j]=min(d[j],j?d[j-1]:1000000000)+r[j];return d.back();}',
 'climbing-stairs':'int climbStairs(int n){int a=1,b=1;while(n--){int c=a+b;a=b;b=c;}return a;}',
 'decode-ways':'int numDecodings(string s){if(s.empty()||s[0]==\'0\')return 0;int a=1,b=1;for(int i=1;i<s.size();i++){int c=s[i]!=\'0\'?b:0;int v=(s[i-1]-\'0\')*10+s[i]-\'0\';if(v>=10&&v<=26)c+=a;a=b;b=c;}return b;}',
 'partition-equal-subset-sum':'bool canPartition(vector<int>&a){int s=accumulate(a.begin(),a.end(),0);if(s%2)return false;vector<bool>d(s/2+1);d[0]=true;for(int x:a)for(int j=s/2;j>=x;j--)d[j]=d[j]||d[j-x];return d[s/2];}',
 'product-of-array-except-self':'vector<int> productExceptSelf(vector<int>&a){vector<int>r(a.size(),1);int p=1;for(int i=0;i<a.size();i++){r[i]=p;p*=a[i];}p=1;for(int i=(int)a.size()-1;i>=0;i--){r[i]*=p;p*=a[i];}return r;}',
 'container-with-most-water':'int maxArea(vector<int>&a){int l=0,r=a.size()-1,ans=0;while(l<r){ans=max(ans,(r-l)*min(a[l],a[r]));if(a[l]<a[r])l++;else r--;}return ans;}',
 'trapping-rain-water':'int trap(vector<int>&a){int l=0,r=(int)a.size()-1,x=0,y=0,ans=0;while(l<=r){if(a[l]<=a[r]){x=max(x,a[l]);ans+=x-a[l++];}else{y=max(y,a[r]);ans+=y-a[r--];}}return ans;}',
 'largest-rectangle-in-histogram':'int largestRectangleArea(vector<int>&a){vector<int>s;int ans=0;for(int i=0;i<=a.size();i++){int h=i==a.size()?0:a[i];while(!s.empty()&&a[s.back()]>=h){int v=a[s.back()];s.pop_back();ans=max(ans,v*(i-(s.empty()?-1:s.back())-1));}s.push_back(i);}return ans;}',
 'search-in-rotated-sorted-array':'int search(vector<int>&a,int t){int l=0,r=(int)a.size()-1;while(l<=r){int m=(l+r)/2;if(a[m]==t)return m;if(a[l]<=a[m]){if(a[l]<=t&&t<a[m])r=m-1;else l=m+1;}else{if(a[m]<t&&t<=a[r])l=m+1;else r=m-1;}}return -1;}',
 'longest-common-subsequence':'int longestCommonSubsequence(string a,string b){vector<int>d(b.size()+1);for(char x:a){int p=0;for(int j=1;j<=b.size();j++){int old=d[j];d[j]=x==b[j-1]?p+1:max(d[j],d[j-1]);p=old;}}return d.back();}',
 'maximal-square':'int maximalSquare(vector<vector<char>>&a){int m=a.size(),n=a[0].size(),ans=0;vector<int>d(n+1);for(int i=1;i<=m;i++){int p=0;for(int j=1;j<=n;j++){int old=d[j];d[j]=a[i-1][j-1]==\'1\'?1+min({p,d[j],d[j-1]}):0;ans=max(ans,d[j]);p=old;}}return ans*ans;}',
 'best-time-to-buy-and-sell-stock':'int maxProfit(vector<int>&a){int lo=INT_MAX,ans=0;for(int x:a){lo=min(lo,x);ans=max(ans,x-lo);}return ans;}'
};
module.exports={codeforces:Object.fromEntries(Object.entries(cf).map(([id,body])=>[id,'#include <bits/stdc++.h>\nusing namespace std;int main(){ios::sync_with_stdio(false);cin.tie(nullptr);'+body+'}\n'])),leetcode:Object.fromEntries(Object.entries(lc).map(([id,body])=>[id,'class Solution{public:'+body+'};']))};
