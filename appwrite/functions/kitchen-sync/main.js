import {Client, Account, TablesDB, Query} from 'node-appwrite';
import {createHash} from 'node:crypto';

const DATABASE = process.env.KITCHEN_DATABASE_ID || '6af6480d001895013491';
const TABLE = 'records';
const KINDS = new Set(['favourite','recipe','entry','history','collection','meal','grocery','profile']);
const conflict = 'This item changed on another device. Review the latest version before saving again.';
const fail = (message, code = 400) => Object.assign(new Error(message), {code, safe:true});
const rowId = (owner, kind, id) => createHash('sha256').update(JSON.stringify([owner,kind,id])).digest('hex').slice(0,36);
const decode = row => ({user_id:row.owner,kind:row.kind,id:row.record_id,data:JSON.parse(row.payload),version:row.version,deleted:row.deleted,updated_at:row.$updatedAt});

export function createHandler({authenticate, tables}) {
  return async ({req,res,error}) => {
    let transaction;
    try {
      const user = await authenticate(req);
      if (!user?.$id) throw fail('Sign in to open your kitchen.',401);
      if (!user.emailVerification) throw fail('Verify your email to enable your private kitchen. Use Resend verification in your account.',403);
      const body = req.bodyJson;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('Invalid request.');
      const base = {databaseId:DATABASE, tableId:TABLE};
      if (body.action === 'list') {
        const offset = Number(body.offset || 0), limit = Number(body.limit || 500);
        if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 500) throw fail('Invalid page.');
        const result = await tables.listRows({...base,queries:[Query.equal('owner',user.$id),Query.orderAsc('$id'),Query.limit(limit),Query.offset(offset)],total:false});
        return res.json({data:result.rows.map(decode)});
      }
      const importing = body.action === 'import';
      if (!importing && body.action !== 'save') throw fail('Unknown operation.');
      const changes = importing ? body.records : body.changes;
      if (!Array.isArray(changes) || changes.length < 1 || changes.length > 90) throw fail('Save at most 90 items at a time.');
      const keys = new Set();
      for (const c of changes) {
        if (!c || !KINDS.has(c.kind) || typeof c.id !== 'string' || !c.id.length || c.id.length > 240 || !c.data || typeof c.data !== 'object' || Array.isArray(c.data)) throw fail('Invalid recipe record.');
        if (Buffer.byteLength(JSON.stringify(c.data)) > 524288) throw fail('This entry is too large. Please shorten its notes.');
        if (c.data.photo && (typeof c.data.photo !== 'string' || !c.data.photo.startsWith(`${user.$id}/`) || !/^[a-zA-Z0-9._-]+$/.test(c.data.photo.split('/')[1]) || c.data.photo.split('/').length !== 2)) throw fail('A photo must belong to your own kitchen.');
        if (!importing && (!Number.isSafeInteger(c.expected_version) || c.expected_version < 0 || c.expected_version >= 2147483646 || typeof c.deleted !== 'boolean')) throw fail('Invalid record version.');
        const key = `${c.kind}:${c.id}`; if(keys.has(key)) throw fail('Duplicate changes.'); keys.add(key);
      }
      transaction = await tables.createTransaction({ttl:60});
      const results = [];
      // Stable order avoids deadlocks for overlapping multi-record writes.
      for (const c of [...changes].sort((a,b)=>`${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`))) {
        const address = {...base,rowId:rowId(user.$id,c.kind,c.id),transactionId:transaction.$id};
        let existing;
        try {existing = await tables.getRow(address);} catch(e) {if(e.code!==404)throw e;}
        if (existing && existing.owner !== user.$id) throw fail('You cannot access that record.',403);
        if (importing && existing) continue; // Account records AND tombstones win.
        if (!importing && (existing?.version || 0) !== c.expected_version) throw fail(conflict,409);
        const data = {owner:user.$id,kind:c.kind,record_id:c.id,payload:JSON.stringify(c.data),version:(existing?.version || 0)+1,deleted:importing?false:c.deleted};
        const row = existing ? await tables.updateRow({...address,data}) : await tables.createRow({...address,data,permissions:[]});
        results.push(decode(row));
      }
      await tables.updateTransaction({transactionId:transaction.$id,commit:true});
      transaction = null;
      return res.json({data:results});
    } catch(e) {
      if (transaction) await tables.updateTransaction({transactionId:transaction.$id,rollback:true}).catch(()=>{});
      const code = e.code === 409 ? 409 : e.safe ? e.code : e.code === 401 ? 401 : 500;
      const message = e.code === 409 ? conflict : e.safe ? e.message : code === 401 ? 'Your session expired. Please log in again.' : 'Your kitchen could not be reached. Please try again.';
      if (!e.safe && code === 500) error(`Kitchen operation failed (${e.code || 'unknown'}).`);
      return res.json({error:{message,code}},code);
    }
  };
}

export default async context => {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const server = new Client().setEndpoint(endpoint).setProject(project).setKey(context.req.headers['x-appwrite-key']);
  return createHandler({
    tables:new TablesDB(server),
    authenticate:async req => {
      const jwt = req.headers['x-appwrite-user-jwt'];
      if(!jwt) throw fail('Sign in to open your kitchen.',401);
      // Verify the signed-in identity with Appwrite; never trust an owner in the body.
      return new Account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)).get();
    }
  })(context);
};
