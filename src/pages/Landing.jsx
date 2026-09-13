import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { product, sampleArticleId } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

export default function Landing() {
  const { user, login } = useAuth()

  return (
    <div className="app-shell">
      <Topbar compact />
      <main className="page landing">
        <section>
          <div className="landing-kicker">从一句话，遇见更大的世界</div>
          <h1>
            读到一句有感的话，发现更多<em>真实的讨论</em>
          </h1>
          <p className="landing-desc">{product.heroDesc}</p>

          <div className="feature-row">
            <div className="feature-card">
              <strong>发现讨论瞬间</strong>
              <p>从长回答里抽出最值得继续讨论的片段</p>
            </div>
            <div className="feature-card">
              <strong>连接更多内容</strong>
              <p>把同一讨论下的回答、文章、话题聚到一起</p>
            </div>
            <div className="feature-card">
              <strong>加入共同讨论</strong>
              <p>一次轻量站位，遇见同频与分歧</p>
            </div>
          </div>

          <div className="cta-stack">
            {user ? (
              <Link className="btn btn-primary" to="/picker">
                查看我的知乎收藏 →
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={login}>
                连接我的知乎账号 →
              </button>
            )}
            <p className="cta-note">
              {user ? `已登录：${user.name}，可读取你的知乎收藏` : '登录后将读取你的知乎收藏，进入真实内容体验'}
            </p>
            <Link className="btn btn-secondary" to={`/read/${sampleArticleId}`}>
              使用示例文章体验
            </Link>
          </div>
        </section>

        <aside className="preview-stack">
          <div className="card preview-answer">
            <div className="q">30岁离开大城市，是一种失败吗？</div>
            <p>
              ……工资少了一半，但
              <span className="hl">我终于有时间陪父母了。</span>
              有人说这是逃避，我觉得只是换了一把尺子。
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              从一句话开始，进入更大的讨论 →
            </p>
          </div>
          <div className="card preview-graph">
            <h3>这个瞬间，正在被很多人讨论</h3>
            <div className="graph-nodes">
              <div className="graph-node">
                职业发展更重要
                <span>1.2k 相关内容</span>
              </div>
              <div className="graph-node">
                生活质量更重要
                <span>2.3k 相关内容</span>
              </div>
              <div className="graph-node">
                取决于人生阶段
                <span>966 相关内容</span>
              </div>
              <div className="graph-node">
                家庭陪伴是核心
                <span>763 相关内容</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
