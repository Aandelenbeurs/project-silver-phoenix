import assert from 'node:assert/strict';
import {validateReference} from '../data/multi-sector/research/intelligence/sources';
import {checkSource,discoverLinks,publicIPv4,robotsAllows,fixedPublicGet} from '../data/multi-sector/research/intelligence/connectors';
async function main(){
 for(const url of ['http://www.advantageog.com/x','https://127.0.0.1/x','https://[::1]/x','https://10.0.0.1/x','file:///etc/passwd','https://user:password@www.advantageog.com/x','https://www.advantageog.com:444/x','https://www.advantageog.com.evil.local/x','https://www.abrasilver.com/x','https://www.advantageog.com/x?token=secret','https://www.advantageog.com/x#part'])assert.throws(()=>validateReference(url,'advantage-energy'),url);
 assert.equal(validateReference('https://www.advantageog.com/investors/newsreleases/article?id=122772','advantage-energy').sourceClass,'primary');
 assert.equal(validateReference('https://example.com/report','advantage-energy').sourceClass,'secondary');
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','0.0.0.0','100.64.1.1','224.0.0.1','198.18.1.1','::1','999.1.1.1','012.0.0.1','8.008.8.8'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
 for(const url of ['https://127.0.0.1/','https://www.advantageog.com/arbitrary','https://www.advantageog.com:444/robots.txt','http://www.advantageog.com/robots.txt'])await assert.rejects(fixedPublicGet(url));
 assert.equal(robotsAllows('User-agent: *\nDisallow: /investors','/investors/news'),false);assert.equal(robotsAllows('User-agent: OtherBot\nDisallow: /','/investors/news'),true);assert.equal(robotsAllows('User-agent: *\nDisallow:','/investors/news'),true);
 const html='<a href="/wp-content/uploads/Q3-2026.pdf?v=tracking">Third quarter report</a><a href="/wp-content/uploads/Q3-2026.pdf">Third quarter report</a><a href="http://127.0.0.1/a">Annual report</a><a href="https://evil.example/x">Financial report</a>';
 assert.equal(discoverLinks(html,'aav-financials').length,1);
 let requests=0;const fake=async(url:string)=>{requests++;return {status:200,text:url.endsWith('robots.txt')?'User-agent: *\nDisallow:':html};};
 const c=await checkSource('aav-financials',[],'2026-10-21T18:00:00Z',fake);assert.equal(c.status,'success');assert.equal(c.found.length,1);assert.equal(requests,2);
 const failed=await checkSource('aav-financials',[c],'2026-10-21T18:01:00Z',async()=>{throw Error('secret server error')});assert.equal(failed.status,'unavailable');assert.equal(failed.lastSuccessAt,c.at);assert.ok(!failed.message.includes('secret'));
 console.log('PASS: fixed URL allowlist, no arbitrary fetch, public IPv4/DNS pin boundary, conservative robots, bounded dedup discovery, partial coverage and safe failure');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
