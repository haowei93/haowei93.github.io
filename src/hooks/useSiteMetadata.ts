import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import siteMetadata from '@/static/site-metadata';

const useSiteMetadata = () => {
  const { id } = useParams();

  return useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    const basePath = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
    const userBase = id ? `${basePath}/users/${id}` : basePath;

    const navLinks = siteMetadata.navLinks.map((link) => {
      if (link.name.toLowerCase() === 'summary') {
        return { ...link, url: `${userBase}/summary` };
      }
      return link;
    });

    return {
      ...siteMetadata,
      siteUrl: userBase || siteMetadata.siteUrl,
      navLinks,
    };
  }, [id]);
};

export default useSiteMetadata;
