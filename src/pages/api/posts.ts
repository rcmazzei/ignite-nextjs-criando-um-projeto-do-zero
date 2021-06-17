import { NextApiRequest, NextApiResponse } from 'next';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<any> => {
  if (req.method === 'POST') {
    const { url } = req.body as { url: string };

    const response = await fetch(
      `${url}&access_token=${process.env.PRISMIC_ACCESS_TOKEN}`
    );

    const data = await response.json();

    res.json(data);
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method not allowed');
  }
};
