const https = require('https');

exports.handler = async (req, res, context) => {
    // 兼容性响应函数
    const sendResponse = (statusCode, data) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        const body = JSON.stringify(data);
        if (typeof res.send === 'function') {
            res.send(body);
        } else {
            res.end(body);
        }
    };

    // 1. 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // 2. 处理 OPTIONS 预检
    if (req.method === 'OPTIONS') {
        sendResponse(200, 'ok');
        return;
    }

    // 3. 仅允许 POST
    if (req.method !== 'POST') {
        sendResponse(405, { error: 'Method Not Allowed' });
        return;
    }

    try {
        // 4. 解析请求体
        let body = {};
        if (req.body) {
            if (typeof req.body === 'string') {
                try { body = JSON.parse(req.body); } catch (e) {}
            } else if (Buffer.isBuffer(req.body)) {
                try { body = JSON.parse(req.body.toString()); } catch (e) {}
            } else if (typeof req.body === 'object') {
                body = req.body;
            }
        }

        const { to, subject, text, html } = body;

        if (!to || !subject) {
            sendResponse(400, { error: 'Missing to or subject' });
            return;
        }

        // 5. 发送邮件 (Resend HTTP API)
        // 使用 Promise 封装 https.request 以确保 await 生效
        const responseData = await new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                from: 'HHTools <admin@mxlhhfamily.com>',
                to: [to],
                subject: subject,
                html: html || text,
                text: text
            });

            const options = {
                hostname: 'api.resend.com',
                port: 443,
                path: '/emails',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', (chunk) => { data += chunk; });
                apiRes.on('end', () => {
                    resolve({ statusCode: apiRes.statusCode, data });
                });
            });

            apiReq.on('error', (e) => {
                reject(e);
            });

            apiReq.write(postData);
            apiReq.end();
        });

        // 6. 处理响应
        if (responseData.statusCode >= 200 && responseData.statusCode < 300) {
            sendResponse(200, { message: 'Email sent via Resend', data: JSON.parse(responseData.data) });
        } else {
            console.error(`Resend Error: ${responseData.data}`);
            sendResponse(responseData.statusCode, { error: 'Resend API Error', details: responseData.data });
        }

    } catch (error) {
        console.error('Handler Error:', error);
        sendResponse(500, { error: error.message, stack: error.stack });
    }
};
