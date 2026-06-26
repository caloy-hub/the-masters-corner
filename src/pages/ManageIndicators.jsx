import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function ManageIndicators() {
  const [domains, setDomains] = useState([])
  const [indicators, setIndicators] = useState([])
  const [activeDomain, setActiveDomain] = useState(1)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [newCode, setNewCode] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDomainTitle, setNewDomainTitle] = useState('')
  const [newDomainNo, setNewDomainNo] = useState('')

  async function load() {
    setLoading(true)
    const { data: d } = await supabase.from('ppst_domains').select('*').order('domain_no')
    const { data: i } = await supabase.from('ppst_indicators').select('*').order('domain_no, objective_code')
    setDomains(d || [])
    setIndicators(i || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addIndicator(e) {
    e.preventDefault()
    if (!newCode.trim() || !newDesc.trim()) { setMessage('Enter both a code and a description.'); return }
    const { error } = await supabase.from('ppst_indicators').insert({
      domain_no: activeDomain, objective_code: newCode.trim(), description: newDesc.trim(),
    })
    if (error) setMessage(error.message)
    else { setNewCode(''); setNewDesc(''); setMessage('Indicator added.'); load() }
  }

  async function updateIndicator(id, field, value) {
    await supabase.from('ppst_indicators').update({ [field]: value }).eq('id', id)
  }

  async function deleteIndicator(id) {
    if (!confirm('Delete this indicator? This cannot be undone, and existing ratings using it will keep their score but lose the description.')) return
    await supabase.from('ppst_indicators').delete().eq('id', id)
    load()
  }

  async function addDomain(e) {
    e.preventDefault()
    const no = Number(newDomainNo)
    if (!no || !newDomainTitle.trim()) { setMessage('Enter a domain number and title.'); return }
    const { error } = await supabase.from('ppst_domains').insert({ domain_no: no, title: newDomainTitle.trim() })
    if (error) setMessage(error.message)
    else { setNewDomainNo(''); setNewDomainTitle(''); setMessage('Domain added.'); load() }
  }

  const domainIndicators = indicators.filter((i) => i.domain_no === activeDomain)

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">RPMS-PPST setup</div>
        <h2>Manage Indicators</h2>
        <p>Add, edit, or remove PPST domains and indicators — the RPMS-PPST form updates immediately, no redeploy needed.</p>
      </div>

      <div className="card">
        <div className="section-title">Domains</div>
        <div className="domain-ribbon" style={{ marginBottom: 16 }}>
          {domains.map((d) => (
            <div
              key={d.domain_no}
              className={`domain-tab ${activeDomain === d.domain_no ? 'active' : ''}`}
              onClick={() => setActiveDomain(d.domain_no)}
            >
              <span className="dot">{d.domain_no}</span>
              {d.title}
              <span className="muted" style={{ marginLeft: 'auto' }}>{indicators.filter((i) => i.domain_no === d.domain_no).length}</span>
            </div>
          ))}
        </div>
        <form onSubmit={addDomain} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, width: 90 }}>
            <label>Domain #</label>
            <input type="number" min="1" value={newDomainNo} onChange={(e) => setNewDomainNo(e.target.value)} placeholder="8" />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>New domain title</label>
            <input value={newDomainTitle} onChange={(e) => setNewDomainTitle(e.target.value)} placeholder="e.g. Domain 8 — School Safety" />
          </div>
          <button className="btn btn-ghost" type="submit">Add domain</button>
        </form>
      </div>

      <div className="card">
        <div className="section-title">Indicators — Domain {activeDomain} {domains.find((d) => d.domain_no === activeDomain)?.title ? `(${domains.find((d) => d.domain_no === activeDomain).title})` : ''}</div>

        {loading ? <p className="muted">Loading…</p> : domainIndicators.length === 0 ? (
          <p className="empty-state">No indicators yet for this domain — add one below.</p>
        ) : (
          <table>
            <thead><tr><th style={{ width: '14%' }}>Code</th><th>Description</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {domainIndicators.map((ind) => (
                <tr key={ind.id}>
                  <td>
                    <input defaultValue={ind.objective_code} onBlur={(e) => updateIndicator(ind.id, 'objective_code', e.target.value)} />
                  </td>
                  <td>
                    <textarea rows={2} defaultValue={ind.description} onBlur={(e) => updateIndicator(ind.id, 'description', e.target.value)} />
                  </td>
                  <td><button className="btn btn-ghost" onClick={() => deleteIndicator(ind.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={addIndicator} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="field-row">
            <div className="field" style={{ flex: '0 0 160px' }}>
              <label>Code</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. 1.4.2" />
            </div>
            <div className="field">
              <label>Description</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Indicator wording, as in the official RPMS Tool" />
            </div>
          </div>
          {message && <p className="muted">{message}</p>}
          <button className="btn btn-primary" type="submit">Add indicator to Domain {activeDomain}</button>
        </form>
      </div>
    </div>
  )
}
