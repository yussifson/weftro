/**
 * SlateSitesAPI.js
 * Complete CRUD API for Slate Sites — company websites natively connected to Slate ERP/CRM
 */

import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// SITE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const SlateSitesAPI = {

  /**
   * Get the site config for a company (management view — requires auth)
   */
  async getSite(companyId) {
    const { data, error } = await supabase
      .from('slate_sites')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Get published site by subdomain or custom domain (public — no auth needed)
   */
  async getPublishedSite(identifier) {
    // identifier can be a subdomain or a full custom domain
    const { data, error } = await supabase
      .from('slate_sites')
      .select('*')
      .eq('is_published', true)
      .or(`subdomain.eq.${identifier},custom_domain.eq.${identifier}`)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Get published site by company_id (public — no auth needed)
   */
  async getPublishedSiteByCompany(companyId) {
    const { data, error } = await supabase
      .from('slate_sites')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Create a new site for a company
   */
  async createSite({ companyId, createdBy, siteName, aiIndustry }) {
    const { data, error } = await supabase
      .from('slate_sites')
      .insert({
        company_id: companyId,
        created_by: createdBy,
        site_name: siteName || 'My Business Website',
        subdomain: null,
        is_published: false,
        ai_industry: aiIndustry,
        updated_date: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Update site config (theme, SEO, domain, etc.)
   */
  async updateSite(siteId, updates) {
    const { data, error } = await supabase
      .from('slate_sites')
      .update({ ...updates, updated_date: new Date().toISOString() })
      .eq('id', siteId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Publish or unpublish a site
   */
  async publishSite(siteId, publish = true) {
    const updates = {
      is_published: publish,
      updated_date: new Date().toISOString(),
    };
    if (publish) {
      updates.published_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('slate_sites')
      .update(updates)
      .eq('id', siteId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Delete a site (and all its pages via CASCADE)
   */
  async deleteSite(siteId) {
    const { error } = await supabase
      .from('slate_sites')
      .delete()
      .eq('id', siteId);
    if (error) throw error;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DOMAIN MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Connect a custom domain to a site
   * (Calls VercelAPI separately from the UI — this just updates the DB)
   */
  async connectDomain(siteId, domain) {
    const { data, error } = await supabase
      .from('slate_sites')
      .update({
        custom_domain: domain,
        domain_verified: false,
        updated_date: new Date().toISOString(),
      })
      .eq('id', siteId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markDomainVerified(siteId) {
    const { data, error } = await supabase
      .from('slate_sites')
      .update({
        domain_verified: true,
        domain_verified_at: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      })
      .eq('id', siteId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PAGES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all pages for a site
   */
  async getPages(siteId) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('page_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Get all published pages for public rendering
   */
  async getPublishedPages(siteId) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_published', true)
      .order('page_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single published page by slug
   */
  async getPageBySlug(siteId, slug) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Create a new page
   */
  async createPage({ siteId, companyId, createdBy, title, slug, pageType, isHome, content }) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .insert({
        site_id: siteId,
        company_id: companyId,
        created_by: createdBy,
        title: title || 'New Page',
        slug: slug || `/${title?.toLowerCase().replace(/\s+/g, '-') || 'page'}`,
        page_type: pageType || 'custom',
        is_home: isHome || false,
        is_published: true,
        content: content || [],
        updated_date: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Update page content (sections) and metadata
   */
  async updatePage(pageId, updates) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .update({ ...updates, updated_date: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Save sections to a page (the builder's primary save action)
   */
  async saveSections(pageId, sections) {
    const { data, error } = await supabase
      .from('slate_site_pages')
      .update({ content: sections, updated_date: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Reorder pages
   */
  async reorderPages(pages) {
    // pages = [{ id, page_order }, ...]
    const updates = pages.map(({ id, page_order }) =>
      supabase.from('slate_site_pages').update({ page_order }).eq('id', id)
    );
    await Promise.all(updates);
  },

  /**
   * Delete a page
   */
  async deletePage(pageId) {
    const { error } = await supabase
      .from('slate_site_pages')
      .delete()
      .eq('id', pageId);
    if (error) throw error;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Track a page visit (public — no auth needed)
   */
  async trackVisit({ siteId, companyId, pageSlug, referrer, sessionId }) {
    try {
      await supabase.from('slate_site_analytics').insert({
        site_id: siteId,
        company_id: companyId,
        page_slug: pageSlug,
        referrer: referrer || document.referrer || '',
        user_agent: navigator.userAgent,
        session_id: sessionId,
        visited_at: new Date().toISOString(),
      });
    } catch (e) {
      // Silently fail — analytics should never break the site
      console.warn('Analytics tracking failed:', e);
    }
  },

  /**
   * Get analytics summary for a site
   */
  async getAnalytics(siteId, { days = 30 } = {}) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('slate_site_analytics')
      .select('*')
      .eq('site_id', siteId)
      .gte('visited_at', since)
      .order('visited_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORM SUBMISSIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Submit a form from the public site (no auth needed)
   */
  async submitForm({ siteId, companyId, pageId, formId, data: formData }) {
    // Extract common contact fields for easy display
    const contactName = formData.name || formData.full_name || formData.contact_name || '';
    const contactEmail = formData.email || formData.contact_email || '';
    const contactPhone = formData.phone || formData.contact_phone || formData.mobile || '';
    const message = formData.message || formData.description || formData.notes || '';

    const { data, error } = await supabase
      .from('slate_site_form_submissions')
      .insert({
        site_id: siteId,
        company_id: companyId,
        page_id: pageId,
        form_id: formId,
        data: formData,
        status: 'new',
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        message: message,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Get all form submissions for a site
   */
  async getSubmissions(siteId, { status } = {}) {
    let query = supabase
      .from('slate_site_form_submissions')
      .select('*')
      .eq('site_id', siteId)
      .order('submitted_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Update submission status (read, converted, archived)
   */
  async updateSubmission(submissionId, updates) {
    const { data, error } = await supabase
      .from('slate_site_form_submissions')
      .update(updates)
      .eq('id', submissionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Convert a submission to a CRM lead
   * Creates a lead in the `leads` table and links it back
   */
  async convertToLead(submission) {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          company_id: submission.company_id,
          name: submission.contact_name,
          email: submission.contact_email,
          phone: submission.contact_phone,
          notes: submission.message,
          source: 'website',
          status: 'new',
          created_date: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Link the submission to the new lead
      await supabase
        .from('slate_site_form_submissions')
        .update({ lead_id: lead.id, status: 'converted' })
        .eq('id', submission.id);

      return lead;
    } catch (e) {
      console.error('Failed to convert submission to lead:', e);
      throw e;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPLATES — Apply a pre-built template to a site
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply a template to a site — replaces all pages with template pages
   */
  async applyTemplate(siteId, companyId, createdBy, templateData) {
    // 1. Delete existing pages
    await supabase.from('slate_site_pages').delete().eq('site_id', siteId);

    // 2. Update site theme from template
    if (templateData.theme) {
      await supabase
        .from('slate_sites')
        .update({
          theme: templateData.theme,
          site_name: templateData.siteName,
          site_description: templateData.siteDescription,
          ai_industry: templateData.industry,
          updated_date: new Date().toISOString(),
        })
        .eq('id', siteId);
    }

    // 3. Create pages from template
    if (templateData.pages && templateData.pages.length > 0) {
      const pageInserts = templateData.pages.map((page, idx) => ({
        site_id: siteId,
        company_id: companyId,
        created_by: createdBy,
        title: page.title,
        slug: page.slug,
        page_type: page.type || 'custom',
        is_home: page.isHome || idx === 0,
        is_published: true,
        content: page.sections || [],
        page_order: idx,
        updated_date: new Date().toISOString(),
      }));

      const { error } = await supabase.from('slate_site_pages').insert(pageInserts);
      if (error) throw error;
    }

    return true;
  },
};

export default SlateSitesAPI;
