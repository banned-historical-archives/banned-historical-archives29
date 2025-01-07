const puppeteer = require('puppeteer');
const notifier = require('node-notifier');
const fs = require('fs-extra');
const {join} = require('path');
const {JSDOM} = require('jsdom');

const axios = require('axios');
const { HttpsProxyAgent } =require('https-proxy-agent');
const proxyUrl = 'http://localhost:8081';
const agent = new HttpsProxyAgent(proxyUrl);

async function get_html(url) {
    let sleep_time = 1;
    while(true) {
  try {
    const browser = await puppeteer.launch({
      headless: true, // 设置为 false 以观察浏览器行为
      args: ['--no-sandbox', '--disable-setuid-sandbox',
        `--proxy-server=http://localhost:8081`
      ]
    });
    const page = await browser.newPage();

    // 设置 User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    // 设置视窗大小
    await page.setViewport({ width: 1280, height: 800 });

    // 访问目标页面
    await page.goto(url, {
      waitUntil: 'networkidle2', // 等待网络空闲
      timeout: 60000, // 设置超时时间
    });

    // 获取页面内容
    const content = await page.content();

    await browser.close();

    if (content.indexOf('you have been blocked') >= 0) {
        console.log('blocked', sleep_time);
        notifier.notify({
            title: 'blocked', // 通知标题
            message: 'blocked', // 通知内容
            sound: true,
            wait: true,
        });
        await new Promise(resolve => setTimeout(resolve, sleep_time*1000))
        sleep_time*=2;
        continue;
    }
    return content;
  } catch (error) {
    console.error('Puppeteer 错误:', error);
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
}

async function get_dom(url) {
    const dom = new JSDOM(await get_html(url))
    return dom;
}
async function download(url) {
  const id = url.substring(url.lastIndexOf('/')+1);
    const p = 'wcda/'+id +'/index.html';
    if (fs.existsSync(p)) {
        console.log('ignore');
        return;
    }
    await fs.ensureDir('wcda/'+id);

    const res = await get_html(url)
    await fs.writeFile(p, res);
    await new Promise(resolve => setTimeout(resolve, 3000));
}
async function downloadFileAfterComplete(url, filePath) {
  if (fs.existsSync(filePath)) {
    console.log('ignore ', url)
    return;
  }

  let t = 1;
  while (true) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      httpsAgent: agent, timeout: 15000
    });

    if (response.status !== 200) {
      throw new Error(`下载失败，状态码: ${response.status}`);
    }

    await fs.writeFile(filePath, response.data);
    console.log(`文件已成功下载并保存到 ${filePath}`);
    break;
  } catch (error) {
    console.error('下载文件出错:', error.message, t);
    await new Promise(resolve => setTimeout(resolve, t * 1000))
    t *= 2
    if (t>4) return;
  }
}
}
async function filter_by_people(id) {
    const host = 'https://digitalarchive.wilsoncenter.org';
    for (let i =0;;++i) {
        console.log('page', i)
        const dom = await get_dom(`${host}/search?search_api_fulltext=&items_per_page=100&sort_bef_combine=created_DESC&f[0]=people%3A${id}&fo[0]=${id}&page=${i}`);
        const candidates = Array.from(dom.window.document.querySelectorAll('.table-striped .document a'));
        if (candidates.length == 0) break;
        for (const i of candidates) {
            const href = i.getAttribute('href');
            console.log(href);
            await download(host + href);
        }
    }
    console.log('done');
}
(async () => {
    // 周恩来
    // await filter_by_people(82187)

    // 毛泽东
    // await filter_by_people(81716)

    const all = [
      "82187","81574","81683","81611","81844","81609","82529","81744","81679","106636","81433","83421","84573","81357","106619","81836","81908","82188","82528","82785","81503","81239","106627","82136","82359","81320","81473",
      "81393","83072","82123","81854","81325","81592","81672","106628","81798","81827","82449","81725","82382","81846","81797","108223","82441","81617","81868","82026","83858","81377","106630","81674","82624","82381","81575","83857","82165","83248","82541","82294","82116","83721","81930","81324",
      "84472","81640","82380","82303","83700","81742","106638","82181","106637","82406","81389","81664","81446","81828","81864","82516","104806","84334","82140","106646","106620","82180","84156","82488","83768","84152","83461","81505","106633","105067","81590","81605","81636",
       "84942",
       "85566","83317","81781","81430","83224","81873","81884","105001","81890","84028","83946","82372","84066","82024","83845","82171","105002","105052","106629","81662","82462","81298","83511","84065","106624","81243","82820","83718","82368","82367","83875","82295","84032","84064","81513","84601","83568","81604","82625","82513","84409","83762","82098","84603","83082","106652","81893","81877","105064","83856","82298","82095","83539","84012","82025","82841","81875","82310","83869","81531","82588","81335","82012","82014","84015","85026","106647","82097","81618","83759","106640","108225","82186","84023","108135","107635","82802","84361","106514","105043","84021","82596","85553","84014","82747","84381","81442",
       "82429","106639","83149","81688","85074","107629","105387","83037","81301","83209","81440","83235","105065","85557","83080","85590","105267","85019","84077","83668","84602","84164","82277","85568","81759","81578","81333","83075","83336","85555","84038","83076","82662","81399","107501","81403","107636","81414","105030","85644","81451","82798","81455","81456","82847","81816","85050","81479","83648","108224","82689","83868","83333","85565","83642","82580","85559","81514","81532","106471","82546","85079","85669","107405","81564","104923","84147","82302","81570","82590","85589","81602","83719","81603","85569","84885","81978","108136","84108","85375","83375","82306","82626","107741","105275","82628","81638","83233","85564","81665","82411","82784","81676","83947","81494","85048","83843","107637","81924","81705","85567","107589","82985","83156","82576","81537","81727","105042","81755","81756","83855","107630","83377","84026","84180","81768","82366","81785","84884","85570","81842","81336","82532","82828","82400","82440","82282","82939","82393","85558","83078","105003","82688","82100","85561","105622","81862","82112","81737","81870","82296","82578","84173","81285","83239","84378","84387","84029","85016","81941","106513","85563","85517","83915","84886","83887","85556","105062","82599","83614","81273","81510","84895","84558","85562","82392","84276","83945","81344","82070","105004","81719","84650","83429","106632","105362","106469","84039","105066","82034","105069","104997","82132","82060","105032","82435","83401","84838","85047","83862","84031","82135","83207","82137","84030","82153","85017","106654","82388","106625","85072","82486","83995","106631","83462","82304","106463","82593","83889","84559","85049","83240","82595","85560","82184","81703","84552"
    ];
    for (const i of all) {
        console.log('people', i);
        await filter_by_people(i);
    }

    let t = 0;
    const host = 'https://digitalarchive.wilsoncenter.org';
    for (const i of fs.readdirSync('./wcda')) {
      const dom = new JSDOM((await fs.readFile(join('./wcda', i, 'index.html'))).toString())

      let j = 1;
      for (const x of Array.from(dom.window.document.querySelectorAll('.pdf-preview'))) {
        await downloadFileAfterComplete(host + x.getAttribute('data'), join('./wcda',i,j+'.pdf'))
        ++j;
      }
      console.log(t++);
    }
    console.log('ok')

})();
