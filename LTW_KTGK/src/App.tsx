import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Post = { id: number; userId: number; title: string; body: string; local?: boolean };
type Comment = { id: number; name: string; email: string; body: string };
type User = { id: number; name: string; username: string; email: string };
type Route = { path: string; search: string };

const POSTS_KEY = 'miniblog.posts';
const AUTH_KEY = 'miniblog.auth';
const PALETTE = ['#d9e6df', '#f0d9d0', '#e6dcae', '#d9d9ec', '#eedcc0', '#d4e1ea'];

function storedPosts(): Post[] {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]') as Post[]; } catch { return []; }
}

function useRoute() {
  const [route, setRoute] = useState<Route>({ path: location.pathname, search: location.search });
  useEffect(() => {
    const sync = () => setRoute({ path: location.pathname, search: location.search });
    addEventListener('popstate', sync);
    return () => removeEventListener('popstate', sync);
  }, []);
  const navigate = useCallback((to: string) => {
    history.pushState({}, '', to);
    setRoute({ path: location.pathname, search: location.search });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return { route, navigate };
}

function App() {
  const { route, navigate } = useRoute();
  const [posts, setPosts] = useState<Post[]>(storedPosts);
  const [user, setUser] = useState<string | null>(() => localStorage.getItem(AUTH_KEY));
  const [toast, setToast] = useState('');

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const login = (username: string) => { localStorage.setItem(AUTH_KEY, username); setUser(username); };
  const logout = () => { localStorage.removeItem(AUTH_KEY); setUser(null); navigate('/'); notify('You have been signed out.'); };
  const addPost = (post: Post) => {
    const next = [post, ...storedPosts()];
    localStorage.setItem(POSTS_KEY, JSON.stringify(next));
    setPosts(next);
    navigate('/');
    notify('Your post has been published!');
  };

  const link = (to: string, children: React.ReactNode, className?: string) => (
    <a className={className} href={to} onClick={(e) => { e.preventDefault(); navigate(to); }}>{children}</a>
  );

  let page: React.ReactNode;
  if (route.path === '/') page = <Home posts={posts} link={link} />;
  else if (route.path === '/login') page = <Login onLogin={login} navigate={navigate} />;
  else if (route.path === '/write') page = user
    ? <Write onSubmit={addPost} />
    : <Login onLogin={login} navigate={navigate} protectedPage />;
  else if (/^\/posts\/\d+$/.test(route.path)) {
    const id = Number(route.path.split('/')[2]);
    page = <PostDetail id={id} posts={posts} link={link} />;
  } else page = <NotFound link={link} />;

  return <div className="app-shell">
    <Header user={user} link={link} onLogout={logout} onExplore={() => {
      navigate('/');
      window.setTimeout(() => document.querySelector('#stories')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }} />
    <main>{page}</main>
    <Footer link={link} />
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function Header({ user, link, onLogout, onExplore }: { user: string | null; link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode; onLogout: () => void; onExplore: () => void }) {
  return <header className="topbar"><div className="nav-wrap">
    {link('/', <><span className="brand-mark">m.</span><span className="brand-name">miniblog</span></>, 'brand')}
    <nav className="nav-links"><a href="/#stories" onClick={(e) => { e.preventDefault(); onExplore(); }}>Explore</a>
      {user ? <>{link('/write', 'Write a post', 'nav-write')}<button className="nav-account" onClick={onLogout}><span className="avatar avatar-small">{user.slice(0, 1).toUpperCase()}</span> Sign out</button></> : link('/login', 'Sign in', 'nav-login')}</nav>
  </div></header>;
}

function Home({ posts, link }: { posts: Post[]; link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode }) {
  const [remote, setRemote] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [postRes, userRes] = await Promise.all([
        fetch('https://jsonplaceholder.typicode.com/posts'), fetch('https://jsonplaceholder.typicode.com/users'),
      ]);
      if (!postRes.ok || !userRes.ok) throw new Error('Unable to connect to the server.');
      const [postData, userData] = await Promise.all([postRes.json() as Promise<Post[]>, userRes.json() as Promise<User[]>]);
      setRemote(postData); setAuthors(Object.fromEntries(userData.map((u) => [u.id, u.name])));
    } catch { setError('Posts could not be loaded. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);
  const allPosts = useMemo(() => [...posts, ...remote], [posts, remote]);
  const filtered = useMemo(() => allPosts.filter((p) => p.title.toLocaleLowerCase('en').includes(query.trim().toLocaleLowerCase('en'))), [allPosts, query]);
  const featured = filtered[0];
  const cards = filtered.slice(1);
  return <>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot" /> A LITTLE CORNER OF THE INTERNET</span>
      <h1>Stories worth<br /><em>reading.</em></h1><p>Good ideas often start with a story.<br className="desktop-break" /> Find something that makes you pause today.</p>
      <a href="#stories" className="hero-cta" onClick={(e) => { e.preventDefault(); document.querySelector('#stories')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore the stories <span>↓</span></a>
      <div className="hero-note"><div className="avatar-stack"><span className="avatar avatar-a">A</span><span className="avatar avatar-b">M</span><span className="avatar avatar-c">L</span></div><span>Fresh ideas, every day</span></div>
    </div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-plant plant-left"><i/><i/><i/><i/><b/></div><div className="art-plant plant-right"><i/><i/><i/><i/><b/></div><div className="art-book"><div className="book-spine"/><div className="book-lines"><i/><i/><i/><i/></div><div className="book-scribble">ideas<br />live here</div></div><span className="art-star star-one">✳</span><span className="art-star star-two">✳</span><span className="art-spark">✦</span><div className="art-caption">a little space<br />to think out loud</div></div></section>
    <section className="stories-section" id="stories"><div className="section-heading"><div><span className="section-kicker">THE MINI EDIT</span><h2>Latest stories <span className="title-star">✳</span></h2></div><span className="post-count">{loading ? 'Loading…' : `${allPosts.length} stories`}</span></div>
      <div className="search-row"><label className="search-box"><span className="search-icon">⌕</span><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories..." aria-label="Search posts by title"/><kbd>⌘ K</kbd></label><div className="category-label">ALL STORIES <span>↗</span></div></div>
      {error && <div className="error-banner"><span>!</span><div><strong>Unable to load posts</strong><p>{error}</p></div><button onClick={() => void load()}>Try again</button></div>}
      {loading && !remote.length ? <div className="loading-state"><span className="spinner"/>Loading stories...</div> : !filtered.length ? <div className="empty-state"><span>⌕</span><h3>No stories found</h3><p>Try a different search term.</p></div> : <div className="post-grid" key={query ? 'search' : 'all'}>
        {featured && <article className="featured-card"><div className="featured-visual" style={{ backgroundColor: PALETTE[(featured.id - 1) % PALETTE.length] }}><span className="feature-pill">{featured.local ? 'YOUR STORY' : 'FEATURED'}</span><span className="visual-number">{String(featured.id).padStart(2, '0')}</span><div className="visual-shape shape-a"/><div className="visual-shape shape-b"/><span className="visual-word">the<br/>little<br/>things</span><span className="visual-asterisk">✳</span></div><div className="featured-content"><div className="post-meta"><span>{featured.local ? 'COMMUNITY' : 'TODAY’S STORY'}</span><i>·</i><span>{featured.local ? 'Just now' : '5 min read'}</span></div>{link(`/posts/${featured.id}`, <h3>{featured.title}</h3>, 'post-title-link')}<p>{featured.body}</p><div className="post-byline"><span className="avatar avatar-feature">{(featured.local ? 'Y' : (authors[featured.userId] || 'M')[0]).toUpperCase()}</span><span><strong>{featured.local ? 'You' : authors[featured.userId] || `Author ${featured.userId}`}</strong><small>{featured.local ? 'Writer' : 'Community author'}</small></span>{link(`/posts/${featured.id}`, 'Read story ↗', 'read-link')}</div></div></article>}
        <div className="side-posts">{cards.slice(0, 3).map((post, index) => <PostRow key={`${post.local ? 'local' : 'api'}-${post.id}`} post={post} author={post.local ? 'You' : authors[post.userId] || `Author ${post.userId}`} index={index} link={link}/>)}
          <div className="newsletter"><span className="newsletter-spark">✳</span><div><strong>Good ideas, straight to your inbox.</strong><span>A little inspiration each week.</span></div><button aria-label="Subscribe to the newsletter">↗</button></div>
        </div>
        {cards.slice(3).map((post, index) => <PostRow key={`${post.local ? 'local' : 'api'}-${post.id}`} post={post} author={post.local ? 'You' : authors[post.userId] || `Author ${post.userId}`} index={index + 3} link={link}/>)}
      </div>}
      {!loading && filtered.length > 0 && <div className="list-footer">Showing {filtered.length} stories <span>✳</span></div>}
    </section>
  </>;
}

function PostRow({ post, author, index, link }: { post: Post; author: string; index: number; link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode }) {
  const category = ['PERSPECTIVES', 'SLOW LIVING', 'CREATIVITY', 'EVERYDAY LIFE'][index % 4];
  return <article className="post-row"><div className="row-top"><span>{post.local ? 'NEW STORY' : category}</span><span>{post.local ? 'Just now' : `${4 + index} min read`}</span></div>{link(`/posts/${post.id}`, <h3>{post.title}</h3>, 'post-title-link')}<p>{post.body}</p><div className="row-bottom"><span className="row-author"><span className="avatar avatar-row" style={{ backgroundColor: PALETTE[(post.id - 1) % PALETTE.length] }}>{author[0]?.toUpperCase()}</span>{author}</span>{link(`/posts/${post.id}`, '↗', 'row-arrow')}</div></article>;
}

function PostDetail({ id, posts, link }: { id: number; posts: Post[]; link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode }) {
  const local = posts.find((p) => p.id === id);
  const [post, setPost] = useState<Post | null>(local || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(!local);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true); setError('');
      try {
        if (!local) { const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`); if (!res.ok) throw new Error(); const data = await res.json() as Post; if (active) setPost(data); }
        const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}/comments`);
        if (!res.ok) throw new Error(); const data = await res.json() as Comment[]; if (active) setComments(data);
      } catch { if (active) setError('Could not load the story or its comments. Please try again.'); }
      finally { if (active) setLoading(false); }
    };
    void run(); return () => { active = false; };
  }, [id, local]);
  if (loading && !post) return <div className="loading-state detail-loading"><span className="spinner"/>Loading story...</div>;
  if (!post && error) return <div className="page-message"><span className="message-mark">!</span><h1>Story not found</h1><p>{error}</p>{link('/', 'Back to home', 'button-dark')}</div>;
  if (!post) return <NotFound link={link}/>;
  return <article className="detail-page"><div className="detail-back">{link('/', '← All stories', 'back-link')}</div><div className="detail-meta"><span>{local ? 'COMMUNITY' : 'TODAY’S STORY'}</span><i>·</i><span>5 min read</span></div><h1>{post.title}</h1><p className="detail-deck">{post.body}</p><div className="detail-author"><span className="avatar avatar-feature">{local ? 'Y' : 'M'}</span><div><strong>{local ? 'You' : `Author ${post.userId}`}</strong><span>Shared on MiniBlog</span></div></div><div className="detail-illustration" style={{ backgroundColor: PALETTE[(post.id - 1) % PALETTE.length] }}><span className="visual-number">{String(post.id).padStart(2, '0')}</span><div className="visual-shape shape-a"/><div className="visual-shape shape-b"/><span className="visual-word">a story<br/>worth sharing</span><span className="visual-asterisk">✳</span></div><div className="detail-body"><p>{post.body}</p><p>{post.body} Every small idea can open up a new perspective—and that is what makes stories worth sharing.</p></div>
    <section className="comments"><div className="comments-heading"><div><span className="section-kicker">THE CONVERSATION</span><h2>Comments <span>({comments.length})</span></h2></div><span className="comment-spark">✳</span></div>{error && <div className="error-banner"><span>!</span><p>{error}</p></div>}{loading ? <div className="loading-state"><span className="spinner"/>Loading comments...</div> : comments.length ? comments.map((c, i) => <div className="comment" key={c.id}><span className="avatar comment-avatar" style={{ backgroundColor: PALETTE[i % PALETTE.length] }}>{c.name[0].toUpperCase()}</span><div><div className="comment-by"><strong>{c.name}</strong><span>{c.email}</span></div><p>{c.body}</p></div></div>) : !error && <p className="muted">No comments yet.</p>}</section>
  </article>;
}

function Login({ onLogin, navigate, protectedPage = false }: { onLogin: (u: string) => void; navigate: (to: string) => void; protectedPage?: boolean }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); if (username.trim() === 'admin' && password === '123456') { onLogin('admin'); navigate(protectedPage ? '/write' : '/'); } else setError('Incorrect username or password.'); };
  return <section className="auth-layout"><div className="auth-art"><span className="auth-art-stamp">m.</span><div className="auth-art-text">A good story<br/><em>starts here.</em></div><div className="auth-art-sun"/><div className="auth-art-book"><span>YOUR<br/>NEXT<br/>CHAPTER</span><i/></div><span className="auth-art-star">✳</span><span className="auth-art-caption">MINIBLOG / COMMUNITY</span></div><div className="auth-panel"><span className="section-kicker">WELCOME BACK</span><h1>{protectedPage ? 'Sign in to write' : 'Come on in.'}</h1><p className="auth-subtitle">{protectedPage ? 'Sign in to start sharing your story.' : 'Sign in to write and share your story.'}</p><form onSubmit={submit} className="auth-form"><label>USERNAME<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. admin" required/></label><label>PASSWORD<input autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required/></label>{error && <p className="form-error">{error}</p>}<button className="button-dark" type="submit">Sign in <span>↗</span></button></form><div className="demo-hint"><span>✳</span><p>Demo account<br/><strong>admin</strong> <i>/</i> <strong>123456</strong></p></div><p className="auth-foot">New here? <span>There is always room at MiniBlog.</span></p></div></section>;
}

function Write({ onSubmit }: { onSubmit: (p: Post) => void }) {
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [error, setError] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); const t = title.trim(), b = body.trim(); if (t.length < 5) { setError('The title must be at least 5 characters long.'); return; } if (b.length < 20) { setError('The story must be at least 20 characters long.'); return; } onSubmit({ id: Date.now(), userId: 0, title: t, body: b, local: true }); };
  return <section className="write-page"><div className="write-head"><span className="section-kicker">YOUR CORNER</span><h1>A story is<br/><em>taking shape.</em></h1><p>Write what you think. Share what you believe.</p></div><form onSubmit={submit} className="write-form"><label>TITLE<input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="Give your story a title" maxLength={120} required/><span>{title.length}/120</span></label><label>STORY<textarea value={body} onChange={(e) => { setBody(e.target.value); setError(''); }} placeholder="Every good story starts somewhere..." rows={9} maxLength={3000} required/><span>{body.length}/3000</span></label>{error && <p className="form-error">{error}</p>}<div className="write-actions"><span><i/>Your story will be saved on this device</span><button className="button-dark" type="submit">Publish story <span>↗</span></button></div></form></section>;
}

function NotFound({ link }: { link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode }) { return <div className="page-message"><span className="notfound-number">404</span><span className="section-kicker">A LITTLE OFF TRACK</span><h1>This page seems to be missing.</h1><p>The link may have changed, or this story may never have existed.</p>{link('/', 'Back to home ↗', 'button-dark')}</div>; }
function Footer({ link }: { link: (to: string, child: React.ReactNode, className?: string) => React.ReactNode }) { return <footer className="footer"><div className="footer-inner">{link('/', <><span className="brand-mark">m.</span><span className="brand-name">miniblog</span></>, 'brand')}<span>Made with curiosity. © 2025 MiniBlog</span><span className="footer-right">A little space for big thoughts <b>✳</b></span></div></footer>; }

export default App;
