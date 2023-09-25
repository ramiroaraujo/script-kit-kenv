// Name: ff Generate JWT Token

import "@johnlindquist/kit";
import {getFFLocalServices} from "../lib/ff-helper";
import {FFService} from "../lib/ff-service";

const serviceName = await getFFLocalServices();

const service = await FFService.init(serviceName);

const jsonwebtoken = await npm('jsonwebtoken');

const envs = await service.getEnvs();

const jwtKeyId = envs["FF_JWT_KEY_ID"];
const jwtPrivKeyBase64 = envs["FF_JWT_PRIVKEY_BASE64"];
const jwtIssuer = envs["FF_JWT_ISSUER"];

const token = jsonwebtoken.sign({}, Buffer.from(jwtPrivKeyBase64, 'base64'), {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: jwtIssuer,
    audience: "https://ff-app-dev.appspot.com",
    keyid: jwtKeyId,
});

await clipboard.writeText(token);
notify("JWT Token copied to clipboard");