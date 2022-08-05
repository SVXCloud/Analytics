import { CLICKHOUSE, RELATIONAL, KAFKA, URL_LENGTH } from 'lib/constants';
import {
  getDateFormatClickhouse,
  prisma,
  rawQueryClickhouse,
  runAnalyticsQuery,
  runQuery,
  kafkaProducer,
} from 'lib/db';

export async function saveEvent(...args) {
  return runAnalyticsQuery({
    [RELATIONAL]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
    [KAFKA]: () => kafkaQuery(...args),
  });
}

async function relationalQuery(website_id, { session_id, url, event_name, event_data }) {
  const data = {
    website_id,
    session_id,
    url: url?.substr(0, URL_LENGTH),
    event_name: event_name?.substr(0, 50),
  };

  if (event_data) {
    data.event_data = {
      create: {
        event_data: event_data,
      },
    };
  }

  return runQuery(
    prisma.event.create({
      data,
    }),
  );
}

async function clickhouseQuery(website_id, { session_uuid, url, event_name }) {
  const params = [website_id, session_uuid, url?.substr(0, URL_LENGTH), event_name?.substr(0, 50)];

  return rawQueryClickhouse(
    `
    insert into umami_dev.event (created_at, website_id, session_uuid, url, event_name)
    values (${getDateFormatClickhouse(new Date())},  $1, $2, $3, $4);`,
    params,
  );
}

async function kafkaQuery(website_id, { session_uuid, url, event_type, event_value }) {
  const params = {
    website_id: website_id,
    session_uuid: session_uuid,
    url: url?.substr(0, URL_LENGTH),
    event_type: event_type?.substr(0, 50),
    event_value: event_value?.substr(0, 50),
  };

  await kafkaProducer(params, 'event');
}
