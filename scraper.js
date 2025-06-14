const axios = require("axios");
const fs = require("fs");

async function scrapeFromRSS() {
  console.log("🔍 Fetching from RSS feed...");
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  };
  
  try {
    // Try RSS feed first (usually less restricted)
    const rssUrl = "https://discourse.onlinedegree.iitm.ac.in/c/courses/tds-kb/34.rss";
    const response = await axios.get(rssUrl, { headers });
    
    // Simple RSS parsing (extract basic info)
    const items = response.data.match(/<item>(.*?)<\/item>/gs) || [];
    const out = [];
    
    for (let item of items.slice(0, 10)) { // Limit to 10 items
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      
      if (titleMatch && linkMatch && descMatch) {
        out.push({
          title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          content: descMatch[1].replace(/<[^>]+>/g, " ").trim(),
          url: linkMatch[1]
        });
        console.log(`✔ Extracted: ${titleMatch[1]}`);
      }
    }
    
    if (out.length > 0) {
      fs.writeFileSync("discourse.json", JSON.stringify(out, null, 2));
      console.log(`✅ Saved ${out.length} items to discourse.json`);
    } else {
      console.log("⚠️ No items extracted from RSS feed");
    }
    
  } catch (error) {
    console.log(`❌ RSS scraping failed: ${error.message}`);
    await fallbackScraping();
  }
}

async function fallbackScraping() {
  console.log("🔄 Trying fallback method with longer delays...");
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://discourse.onlinedegree.iitm.ac.in/'
  };
  
  try {
    // Much longer delay between requests
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const res = await axios.get("https://discourse.onlinedegree.iitm.ac.in/c/courses/tds-kb/34.json", { 
      headers,
      timeout: 10000 
    });
    
    const topics = res.data.topic_list.topics.slice(0, 5); // Limit to 5 topics
    const out = [];
    
    for (let t of topics) {
      try {
        // Very long delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const r2 = await axios.get(`https://discourse.onlinedegree.iitm.ac.in/t/${t.slug}/${t.id}.json`, { 
          headers,
          timeout: 10000 
        });
        
        const post = r2.data.post_stream.posts[0];
        out.push({
          title: t.title,
          content: post.cooked.replace(/<[^>]+>/g, " ").trim(),
          url: `https://discourse.onlinedegree.iitm.ac.in/t/${t.slug}/${t.id}`
        });
        console.log(`✔ Fetched: ${t.title}`);
        
      } catch (error) {
        console.log(`⚠️ Skipped topic ID ${t.id} - ${error.response?.status || 'Network error'}`);
      }
    }
    
    if (out.length > 0) {
      fs.writeFileSync("discourse.json", JSON.stringify(out, null, 2));
      console.log(`✅ Saved ${out.length} items to discourse.json`);
    }
    
  } catch (error) {
    console.log(`❌ Fallback scraping also failed: ${error.message}`);
    console.log("💡 Consider using the sample data or manual data entry");
  }
}

scrapeFromRSS();


