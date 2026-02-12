import { useNavigate, useParams, type NavigateOptions, type To } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Drop-in replacement for useNavigate() that auto-prefixes paths with /org/:slug.
 * Pages just swap the import and all navigate('/cases') calls become /org/sperger/cases.
 */
export function useOrgNavigate() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      // Only prefix absolute paths that aren't already /login or /org/
      if (typeof to === 'string' && to.startsWith('/') && slug) {
        if (!to.startsWith('/login') && !to.startsWith('/org/')) {
          const prefixed = `/org/${slug}${to === '/' ? '' : to}`;
          navigate(prefixed, options);
          return;
        }
      }

      navigate(to, options);
    },
    [navigate, slug]
  );
}
