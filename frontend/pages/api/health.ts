import type { NextApiRequest, NextApiResponse } from 'next';

export default function health(_request: NextApiRequest, response: NextApiResponse) {
  response.status(200).json({ status: 'ok' });
}
