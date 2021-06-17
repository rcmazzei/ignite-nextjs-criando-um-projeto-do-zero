import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import { useEffect } from 'react';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface PostPagination {
  uid: string;
  title: string;
}
interface Post {
  uid?: string;
  first_publication_date: string | null;
  last_publication_date?: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
  prevPost?: PostPagination;
  nextPost?: PostPagination;
  preview?: boolean;
}
interface PostProps {
  post: Post;
  // prevPost?: PostPagination;
  // nextPost?: PostPagination;
  // preview: boolean;
}

function calculateEstimatedReadingTime(post: Post): string {
  let estimated_reading_time = 0;

  const totalWords = post.data.content.reduce((totalHead, head) => {
    let wordsHead = head.heading.split(' ').length + 1;

    wordsHead += head.body.reduce((totalBody, body) => {
      const wordsBody = body.text.split(' ').length;

      return totalBody + wordsBody;
    }, 0);

    return totalHead + wordsHead;
  }, 0);

  if (totalWords > 0) {
    estimated_reading_time = Math.ceil(totalWords / 200);
  }

  return `${estimated_reading_time} min`;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  const { prevPost, nextPost, preview } = post;
  const estimated_reading_time = calculateEstimatedReadingTime(post);

  useEffect(() => {
    const anchor = document.getElementById('comments');

    if (anchor) {
      const script = document.createElement('script');
      script.setAttribute('src', 'https://utteranc.es/client.js');
      script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('async', 'true');
      script.setAttribute('repo', 'rcmazzei/space-traveling');
      script.setAttribute('issue-term', 'pathname');
      script.setAttribute('theme', 'github-dark');

      anchor.appendChild(script);
    }
    return () => {
      anchor?.removeChild(anchor.firstChild);
    };
  }, [post.uid]);

  if (isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Header />
      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="banner" />
      </div>
      <div className={commonStyles.container}>
        <main className={styles.content}>
          <h1>{post.data.title}</h1>
          <div className={styles.info}>
            <div>
              <FiCalendar size={20} />
              <span>
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
            </div>
            <div>
              <FiUser size={20} />
              <span>{post.data.author}</span>
            </div>
            <div>
              <FiClock size={20} />
              <span>{estimated_reading_time}</span>
            </div>
          </div>
          <span>
            {post.last_publication_date &&
              post.last_publication_date !== post.first_publication_date &&
              format(
                new Date(post.last_publication_date),
                "'*editado em' dd MMM yyyy', às' hh:m",
                {
                  locale: ptBR,
                }
              )}
          </span>
          {post.data.content.map(c => (
            <article key={c.heading}>
              <strong>{c.heading}</strong>
              {c.body.map(b => (
                <p key={b.text}>{b.text}</p>
              ))}
            </article>
          ))}
        </main>
        <footer className={styles.footer}>
          <div>
            {prevPost?.uid && (
              <Link href={`/post/${prevPost.uid}`}>
                <a>
                  <strong>{prevPost.title}</strong>
                  <span>Post anterior</span>
                </a>
              </Link>
            )}
          </div>
          <div className={styles.nextPost}>
            {nextPost?.uid && (
              <Link href={`/post/${nextPost.uid}`}>
                <a>
                  <strong>{nextPost.title}</strong>
                  <span>Próximo post</span>
                </a>
              </Link>
            )}
          </div>
        </footer>
        <div id="comments" />
        {preview ? (
          <Link href="/api/exit-preview">
            <a className={styles.previewButton}>
              <span>Sair do Modo Preview</span>
            </a>
          </Link>
        ) : null}
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 20,
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date:
      response.first_publication_date ?? new Date().toISOString(),
    last_publication_date:
      response.last_publication_date ?? new Date().toISOString(),
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url ?? '',
      },
      content: response.data.content,
    },
  };

  const prevPostResponse = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'posts'),
      Prismic.predicates.dateBefore(
        'document.first_publication_date',
        new Date(post.first_publication_date)
      ),
    ],
    {
      pageSize: 1,
      orderings: ['[document.first_publication_date desc]'],
      ref: previewData?.ref ?? null,
    }
  );

  const prevPost = {
    uid: prevPostResponse?.results[0]?.uid ?? null,
    title: prevPostResponse?.results[0]?.data?.title ?? null,
  };

  const nextPostResponse = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'posts'),
      Prismic.predicates.dateAfter(
        'document.first_publication_date',
        new Date(post.first_publication_date)
      ),
    ],
    {
      pageSize: 1,
      orderings: ['[document.first_publication_date]'],
      ref: previewData?.ref ?? null,
    }
  );

  const nextPost = {
    uid: nextPostResponse?.results[0]?.uid ?? null,
    title: nextPostResponse?.results[0]?.data?.title ?? null,
  };

  // console.log(JSON.stringify(response, null, 3));

  return {
    props: {
      post: {
        ...post,
        prevPost,
        nextPost,
        preview,
      },
    },
  };
};
