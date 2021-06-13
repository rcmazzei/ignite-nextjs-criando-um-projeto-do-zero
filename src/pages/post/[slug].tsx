import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
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
}

interface PostProps {
  post: Post;
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

  if (isFallback) {
    return <div>Carregando...</div>;
  }

  const estimated_reading_time = calculateEstimatedReadingTime(post);

  return (
    <>
      <Header />
      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="banner" />
      </div>
      <div className={commonStyles.container}>
        <main className={styles.content}>
          <h1>{post.data.title}</h1>
          <div>
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
          {post.data.content.map(c => (
            <article key={c.heading}>
              <strong>{c.heading}</strong>
              {c.body.map(b => (
                <p key={b.text}>{b.text}</p>
              ))}
            </article>
          ))}
        </main>
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

  // console.log(paths);

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();

  const { slug } = context.params;

  const response = await prismic.getByUID('posts', String(slug), {});

  // console.log(JSON.stringify(response, null, 3));

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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

  return {
    props: {
      post,
    },
  };
};
