-- Fix RLS Policies for 138 new tables

DROP POLICY IF EXISTS "Allow company access on univ_accesscontrols" ON public.univ_accesscontrols;
CREATE POLICY "Allow company access on univ_accesscontrols" ON public.univ_accesscontrols FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_adspend" ON public.univ_adspend;
CREATE POLICY "Allow company access on univ_adspend" ON public.univ_adspend FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_advocacy" ON public.univ_advocacy;
CREATE POLICY "Allow company access on univ_advocacy" ON public.univ_advocacy FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_affiliateprogram" ON public.univ_affiliateprogram;
CREATE POLICY "Allow company access on univ_affiliateprogram" ON public.univ_affiliateprogram FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_agentcommissions" ON public.univ_agentcommissions;
CREATE POLICY "Allow company access on univ_agentcommissions" ON public.univ_agentcommissions FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_allergylist" ON public.univ_allergylist;
CREATE POLICY "Allow company access on univ_allergylist" ON public.univ_allergylist FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_apiintegrations" ON public.univ_apiintegrations;
CREATE POLICY "Allow company access on univ_apiintegrations" ON public.univ_apiintegrations FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_appointments" ON public.univ_appointments;
CREATE POLICY "Allow company access on univ_appointments" ON public.univ_appointments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_arbitration" ON public.univ_arbitration;
CREATE POLICY "Allow company access on univ_arbitration" ON public.univ_arbitration FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_assemblylines" ON public.univ_assemblylines;
CREATE POLICY "Allow company access on univ_assemblylines" ON public.univ_assemblylines FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_assets" ON public.univ_assets;
CREATE POLICY "Allow company access on univ_assets" ON public.univ_assets FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_attendance" ON public.univ_attendance;
CREATE POLICY "Allow company access on univ_attendance" ON public.univ_attendance FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_audittrails" ON public.univ_audittrails;
CREATE POLICY "Allow company access on univ_audittrails" ON public.univ_audittrails FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_beneficiarylist" ON public.univ_beneficiarylist;
CREATE POLICY "Allow company access on univ_beneficiarylist" ON public.univ_beneficiarylist FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_benefitelection" ON public.univ_benefitelection;
CREATE POLICY "Allow company access on univ_benefitelection" ON public.univ_benefitelection FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_billofladings" ON public.univ_billofladings;
CREATE POLICY "Allow company access on univ_billofladings" ON public.univ_billofladings FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_blueprints" ON public.univ_blueprints;
CREATE POLICY "Allow company access on univ_blueprints" ON public.univ_blueprints FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_boms" ON public.univ_boms;
CREATE POLICY "Allow company access on univ_boms" ON public.univ_boms FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_bookings" ON public.univ_bookings;
CREATE POLICY "Allow company access on univ_bookings" ON public.univ_bookings FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_boqs" ON public.univ_boqs;
CREATE POLICY "Allow company access on univ_boqs" ON public.univ_boqs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_brandasset" ON public.univ_brandasset;
CREATE POLICY "Allow company access on univ_brandasset" ON public.univ_brandasset FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_briefs" ON public.univ_briefs;
CREATE POLICY "Allow company access on univ_briefs" ON public.univ_briefs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_budgetforecasts" ON public.univ_budgetforecasts;
CREATE POLICY "Allow company access on univ_budgetforecasts" ON public.univ_budgetforecasts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_calllogs" ON public.univ_calllogs;
CREATE POLICY "Allow company access on univ_calllogs" ON public.univ_calllogs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_campaignmetric" ON public.univ_campaignmetric;
CREATE POLICY "Allow company access on univ_campaignmetric" ON public.univ_campaignmetric FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_campaignschedule" ON public.univ_campaignschedule;
CREATE POLICY "Allow company access on univ_campaignschedule" ON public.univ_campaignschedule FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_carrental" ON public.univ_carrental;
CREATE POLICY "Allow company access on univ_carrental" ON public.univ_carrental FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_carriercontracts" ON public.univ_carriercontracts;
CREATE POLICY "Allow company access on univ_carriercontracts" ON public.univ_carriercontracts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_cases" ON public.univ_cases;
CREATE POLICY "Allow company access on univ_cases" ON public.univ_cases FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_changerequests" ON public.univ_changerequests;
CREATE POLICY "Allow company access on univ_changerequests" ON public.univ_changerequests FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_chattranscripts" ON public.univ_chattranscripts;
CREATE POLICY "Allow company access on univ_chattranscripts" ON public.univ_chattranscripts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_churnrisks" ON public.univ_churnrisks;
CREATE POLICY "Allow company access on univ_churnrisks" ON public.univ_churnrisks FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_class_attendance" ON public.univ_class_attendance;
CREATE POLICY "Allow company access on univ_class_attendance" ON public.univ_class_attendance FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_clientledger" ON public.univ_clientledger;
CREATE POLICY "Allow company access on univ_clientledger" ON public.univ_clientledger FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_client_portal" ON public.univ_client_portal;
CREATE POLICY "Allow company access on univ_client_portal" ON public.univ_client_portal FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_coldchains" ON public.univ_coldchains;
CREATE POLICY "Allow company access on univ_coldchains" ON public.univ_coldchains FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_commissionstructure" ON public.univ_commissionstructure;
CREATE POLICY "Allow company access on univ_commissionstructure" ON public.univ_commissionstructure FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_competitorprices" ON public.univ_competitorprices;
CREATE POLICY "Allow company access on univ_competitorprices" ON public.univ_competitorprices FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_concretetests" ON public.univ_concretetests;
CREATE POLICY "Allow company access on univ_concretetests" ON public.univ_concretetests FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_conflictcheck" ON public.univ_conflictcheck;
CREATE POLICY "Allow company access on univ_conflictcheck" ON public.univ_conflictcheck FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_consultation" ON public.univ_consultation;
CREATE POLICY "Allow company access on univ_consultation" ON public.univ_consultation FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_contacts" ON public.univ_contacts;
CREATE POLICY "Allow company access on univ_contacts" ON public.univ_contacts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_contractmanagements" ON public.univ_contractmanagements;
CREATE POLICY "Allow company access on univ_contractmanagements" ON public.univ_contractmanagements FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_contractors" ON public.univ_contractors;
CREATE POLICY "Allow company access on univ_contractors" ON public.univ_contractors FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_courses" ON public.univ_courses;
CREATE POLICY "Allow company access on univ_courses" ON public.univ_courses FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_court_calendar" ON public.univ_court_calendar;
CREATE POLICY "Allow company access on univ_court_calendar" ON public.univ_court_calendar FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_crm_leads" ON public.univ_crm_leads;
CREATE POLICY "Allow company access on univ_crm_leads" ON public.univ_crm_leads FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_crossdockings" ON public.univ_crossdockings;
CREATE POLICY "Allow company access on univ_crossdockings" ON public.univ_crossdockings FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_customerjourneys" ON public.univ_customerjourneys;
CREATE POLICY "Allow company access on univ_customerjourneys" ON public.univ_customerjourneys FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_customerreviews" ON public.univ_customerreviews;
CREATE POLICY "Allow company access on univ_customerreviews" ON public.univ_customerreviews FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_customersegments" ON public.univ_customersegments;
CREATE POLICY "Allow company access on univ_customersegments" ON public.univ_customersegments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_customsdocs" ON public.univ_customsdocs;
CREATE POLICY "Allow company access on univ_customsdocs" ON public.univ_customsdocs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_damagedgoodss" ON public.univ_damagedgoodss;
CREATE POLICY "Allow company access on univ_damagedgoodss" ON public.univ_damagedgoodss FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_databackups" ON public.univ_databackups;
CREATE POLICY "Allow company access on univ_databackups" ON public.univ_databackups FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_deliveries" ON public.univ_deliveries;
CREATE POLICY "Allow company access on univ_deliveries" ON public.univ_deliveries FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_digitalassets" ON public.univ_digitalassets;
CREATE POLICY "Allow company access on univ_digitalassets" ON public.univ_digitalassets FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_dining_orders" ON public.univ_dining_orders;
CREATE POLICY "Allow company access on univ_dining_orders" ON public.univ_dining_orders FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_dischargesummary" ON public.univ_dischargesummary;
CREATE POLICY "Allow company access on univ_dischargesummary" ON public.univ_dischargesummary FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_disciplinary" ON public.univ_disciplinary;
CREATE POLICY "Allow company access on univ_disciplinary" ON public.univ_disciplinary FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_discounts" ON public.univ_discounts;
CREATE POLICY "Allow company access on univ_discounts" ON public.univ_discounts FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_dispatch" ON public.univ_dispatch;
CREATE POLICY "Allow company access on univ_dispatch" ON public.univ_dispatch FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_documents" ON public.univ_documents;
CREATE POLICY "Allow company access on univ_documents" ON public.univ_documents FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_donationlog" ON public.univ_donationlog;
CREATE POLICY "Allow company access on univ_donationlog" ON public.univ_donationlog FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_donorprofile" ON public.univ_donorprofile;
CREATE POLICY "Allow company access on univ_donorprofile" ON public.univ_donorprofile FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_employeeperformances" ON public.univ_employeeperformances;
CREATE POLICY "Allow company access on univ_employeeperformances" ON public.univ_employeeperformances FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_emr" ON public.univ_emr;
CREATE POLICY "Allow company access on univ_emr" ON public.univ_emr FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_equipmentrentals" ON public.univ_equipmentrentals;
CREATE POLICY "Allow company access on univ_equipmentrentals" ON public.univ_equipmentrentals FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_escrow" ON public.univ_escrow;
CREATE POLICY "Allow company access on univ_escrow" ON public.univ_escrow FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_eventplanner" ON public.univ_eventplanner;
CREATE POLICY "Allow company access on univ_eventplanner" ON public.univ_eventplanner FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_exitinterview" ON public.univ_exitinterview;
CREATE POLICY "Allow company access on univ_exitinterview" ON public.univ_exitinterview FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_expenseclaim" ON public.univ_expenseclaim;
CREATE POLICY "Allow company access on univ_expenseclaim" ON public.univ_expenseclaim FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_expensereports" ON public.univ_expensereports;
CREATE POLICY "Allow company access on univ_expensereports" ON public.univ_expensereports FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_expertwitness" ON public.univ_expertwitness;
CREATE POLICY "Allow company access on univ_expertwitness" ON public.univ_expertwitness FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_faculty" ON public.univ_faculty;
CREATE POLICY "Allow company access on univ_faculty" ON public.univ_faculty FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_featurerequests" ON public.univ_featurerequests;
CREATE POLICY "Allow company access on univ_featurerequests" ON public.univ_featurerequests FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_feedbacksurvey" ON public.univ_feedbacksurvey;
CREATE POLICY "Allow company access on univ_feedbacksurvey" ON public.univ_feedbacksurvey FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_fleet" ON public.univ_fleet;
CREATE POLICY "Allow company access on univ_fleet" ON public.univ_fleet FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_forkliftmaintenances" ON public.univ_forkliftmaintenances;
CREATE POLICY "Allow company access on univ_forkliftmaintenances" ON public.univ_forkliftmaintenances FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_gdprrequests" ON public.univ_gdprrequests;
CREATE POLICY "Allow company access on univ_gdprrequests" ON public.univ_gdprrequests FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_generalledgers" ON public.univ_generalledgers;
CREATE POLICY "Allow company access on univ_generalledgers" ON public.univ_generalledgers FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_giftcards" ON public.univ_giftcards;
CREATE POLICY "Allow company access on univ_giftcards" ON public.univ_giftcards FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_gradebook" ON public.univ_gradebook;
CREATE POLICY "Allow company access on univ_gradebook" ON public.univ_gradebook FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_healthsafetys" ON public.univ_healthsafetys;
CREATE POLICY "Allow company access on univ_healthsafetys" ON public.univ_healthsafetys FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_hoas" ON public.univ_hoas;
CREATE POLICY "Allow company access on univ_hoas" ON public.univ_hoas FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_hotelreview" ON public.univ_hotelreview;
CREATE POLICY "Allow company access on univ_hotelreview" ON public.univ_hotelreview FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_housekeeping" ON public.univ_housekeeping;
CREATE POLICY "Allow company access on univ_housekeeping" ON public.univ_housekeeping FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_hr_employees" ON public.univ_hr_employees;
CREATE POLICY "Allow company access on univ_hr_employees" ON public.univ_hr_employees FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_immunization" ON public.univ_immunization;
CREATE POLICY "Allow company access on univ_immunization" ON public.univ_immunization FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_incidentreports" ON public.univ_incidentreports;
CREATE POLICY "Allow company access on univ_incidentreports" ON public.univ_incidentreports FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_inkinddonation" ON public.univ_inkinddonation;
CREATE POLICY "Allow company access on univ_inkinddonation" ON public.univ_inkinddonation FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_insurancepolicy" ON public.univ_insurancepolicy;
CREATE POLICY "Allow company access on univ_insurancepolicy" ON public.univ_insurancepolicy FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_inventory" ON public.univ_inventory;
CREATE POLICY "Allow company access on univ_inventory" ON public.univ_inventory FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_invoices" ON public.univ_invoices;
CREATE POLICY "Allow company access on univ_invoices" ON public.univ_invoices FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_ipaddresses" ON public.univ_ipaddresses;
CREATE POLICY "Allow company access on univ_ipaddresses" ON public.univ_ipaddresses FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_kbarticles" ON public.univ_kbarticles;
CREATE POLICY "Allow company access on univ_kbarticles" ON public.univ_kbarticles FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_kpitrackers" ON public.univ_kpitrackers;
CREATE POLICY "Allow company access on univ_kpitrackers" ON public.univ_kpitrackers FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_labs" ON public.univ_labs;
CREATE POLICY "Allow company access on univ_labs" ON public.univ_labs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_leadmagnets" ON public.univ_leadmagnets;
CREATE POLICY "Allow company access on univ_leadmagnets" ON public.univ_leadmagnets FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_lease" ON public.univ_lease;
CREATE POLICY "Allow company access on univ_lease" ON public.univ_lease FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_leave_management" ON public.univ_leave_management;
CREATE POLICY "Allow company access on univ_leave_management" ON public.univ_leave_management FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_legal_documents" ON public.univ_legal_documents;
CREATE POLICY "Allow company access on univ_legal_documents" ON public.univ_legal_documents FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_listing" ON public.univ_listing;
CREATE POLICY "Allow company access on univ_listing" ON public.univ_listing FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_lms_lessons" ON public.univ_lms_lessons;
CREATE POLICY "Allow company access on univ_lms_lessons" ON public.univ_lms_lessons FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_loyaltypoints" ON public.univ_loyaltypoints;
CREATE POLICY "Allow company access on univ_loyaltypoints" ON public.univ_loyaltypoints FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_luggageclaim" ON public.univ_luggageclaim;
CREATE POLICY "Allow company access on univ_luggageclaim" ON public.univ_luggageclaim FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_machines" ON public.univ_machines;
CREATE POLICY "Allow company access on univ_machines" ON public.univ_machines FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_maintenancerequest" ON public.univ_maintenancerequest;
CREATE POLICY "Allow company access on univ_maintenancerequest" ON public.univ_maintenancerequest FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_meetingminutess" ON public.univ_meetingminutess;
CREATE POLICY "Allow company access on univ_meetingminutess" ON public.univ_meetingminutess FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_menus" ON public.univ_menus;
CREATE POLICY "Allow company access on univ_menus" ON public.univ_menus FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_newsletter" ON public.univ_newsletter;
CREATE POLICY "Allow company access on univ_newsletter" ON public.univ_newsletter FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_onboardingtask" ON public.univ_onboardingtask;
CREATE POLICY "Allow company access on univ_onboardingtask" ON public.univ_onboardingtask FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_operationtheater" ON public.univ_operationtheater;
CREATE POLICY "Allow company access on univ_operationtheater" ON public.univ_operationtheater FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_orderregistrys" ON public.univ_orderregistrys;
CREATE POLICY "Allow company access on univ_orderregistrys" ON public.univ_orderregistrys FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_orgchart" ON public.univ_orgchart;
CREATE POLICY "Allow company access on univ_orgchart" ON public.univ_orgchart FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_pallettracker" ON public.univ_pallettracker;
CREATE POLICY "Allow company access on univ_pallettracker" ON public.univ_pallettracker FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_parent_portal_access" ON public.univ_parent_portal_access;
CREATE POLICY "Allow company access on univ_parent_portal_access" ON public.univ_parent_portal_access FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_patients" ON public.univ_patients;
CREATE POLICY "Allow company access on univ_patients" ON public.univ_patients FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_payments" ON public.univ_payments;
CREATE POLICY "Allow company access on univ_payments" ON public.univ_payments FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_payroll" ON public.univ_payroll;
CREATE POLICY "Allow company access on univ_payroll" ON public.univ_payroll FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_permittrackers" ON public.univ_permittrackers;
CREATE POLICY "Allow company access on univ_permittrackers" ON public.univ_permittrackers FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_pledge" ON public.univ_pledge;
CREATE POLICY "Allow company access on univ_pledge" ON public.univ_pledge FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_pos" ON public.univ_pos;
CREATE POLICY "Allow company access on univ_pos" ON public.univ_pos FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_pressrelease" ON public.univ_pressrelease;
CREATE POLICY "Allow company access on univ_pressrelease" ON public.univ_pressrelease FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_procurement" ON public.univ_procurement;
CREATE POLICY "Allow company access on univ_procurement" ON public.univ_procurement FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_productcatalogs" ON public.univ_productcatalogs;
CREATE POLICY "Allow company access on univ_productcatalogs" ON public.univ_productcatalogs FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_productionschedules" ON public.univ_productionschedules;
CREATE POLICY "Allow company access on univ_productionschedules" ON public.univ_productionschedules FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_projects" ON public.univ_projects;
CREATE POLICY "Allow company access on univ_projects" ON public.univ_projects FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_projectmilestones" ON public.univ_projectmilestones;
CREATE POLICY "Allow company access on univ_projectmilestones" ON public.univ_projectmilestones FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_property" ON public.univ_property;
CREATE POLICY "Allow company access on univ_property" ON public.univ_property FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_propertyinspection" ON public.univ_propertyinspection;
CREATE POLICY "Allow company access on univ_propertyinspection" ON public.univ_propertyinspection FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_rawmaterials" ON public.univ_rawmaterials;
CREATE POLICY "Allow company access on univ_rawmaterials" ON public.univ_rawmaterials FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_recruitment" ON public.univ_recruitment;
CREATE POLICY "Allow company access on univ_recruitment" ON public.univ_recruitment FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_retainer" ON public.univ_retainer;
CREATE POLICY "Allow company access on univ_retainer" ON public.univ_retainer FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_returnrefunds" ON public.univ_returnrefunds;
CREATE POLICY "Allow company access on univ_returnrefunds" ON public.univ_returnrefunds FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_riskregisters" ON public.univ_riskregisters;
CREATE POLICY "Allow company access on univ_riskregisters" ON public.univ_riskregisters FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_routes" ON public.univ_routes;
CREATE POLICY "Allow company access on univ_routes" ON public.univ_routes FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_safety" ON public.univ_safety;
CREATE POLICY "Allow company access on univ_safety" ON public.univ_safety FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_salestargets" ON public.univ_salestargets;
CREATE POLICY "Allow company access on univ_salestargets" ON public.univ_salestargets FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_scraprates" ON public.univ_scraprates;
CREATE POLICY "Allow company access on univ_scraprates" ON public.univ_scraprates FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_seokeyword" ON public.univ_seokeyword;
CREATE POLICY "Allow company access on univ_seokeyword" ON public.univ_seokeyword FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_servermetrics" ON public.univ_servermetrics;
CREATE POLICY "Allow company access on univ_servermetrics" ON public.univ_servermetrics FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_site_inspections" ON public.univ_site_inspections;
CREATE POLICY "Allow company access on univ_site_inspections" ON public.univ_site_inspections FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_slaagreements" ON public.univ_slaagreements;
CREATE POLICY "Allow company access on univ_slaagreements" ON public.univ_slaagreements FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_snaglists" ON public.univ_snaglists;
CREATE POLICY "Allow company access on univ_snaglists" ON public.univ_snaglists FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_softwarelicenses" ON public.univ_softwarelicenses;
CREATE POLICY "Allow company access on univ_softwarelicenses" ON public.univ_softwarelicenses FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_sponsorship" ON public.univ_sponsorship;
CREATE POLICY "Allow company access on univ_sponsorship" ON public.univ_sponsorship FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_sslcertificates" ON public.univ_sslcertificates;
CREATE POLICY "Allow company access on univ_sslcertificates" ON public.univ_sslcertificates FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_students" ON public.univ_students;
CREATE POLICY "Allow company access on univ_students" ON public.univ_students FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_supplierdirectorys" ON public.univ_supplierdirectorys;
CREATE POLICY "Allow company access on univ_supplierdirectorys" ON public.univ_supplierdirectorys FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_supporttickets" ON public.univ_supporttickets;
CREATE POLICY "Allow company access on univ_supporttickets" ON public.univ_supporttickets FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_tablereservation" ON public.univ_tablereservation;
CREATE POLICY "Allow company access on univ_tablereservation" ON public.univ_tablereservation FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_taxfilings" ON public.univ_taxfilings;
CREATE POLICY "Allow company access on univ_taxfilings" ON public.univ_taxfilings FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_tenant" ON public.univ_tenant;
CREATE POLICY "Allow company access on univ_tenant" ON public.univ_tenant FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_ticketsales" ON public.univ_ticketsales;
CREATE POLICY "Allow company access on univ_ticketsales" ON public.univ_ticketsales FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_timebilling" ON public.univ_timebilling;
CREATE POLICY "Allow company access on univ_timebilling" ON public.univ_timebilling FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_projects" ON public.univ_projects;
CREATE POLICY "Allow company access on univ_projects" ON public.univ_projects FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_timesheet" ON public.univ_timesheet;
CREATE POLICY "Allow company access on univ_timesheet" ON public.univ_timesheet FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_tourpackage" ON public.univ_tourpackage;
CREATE POLICY "Allow company access on univ_tourpackage" ON public.univ_tourpackage FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_trademark" ON public.univ_trademark;
CREATE POLICY "Allow company access on univ_trademark" ON public.univ_trademark FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_trainingrecords" ON public.univ_trainingrecords;
CREATE POLICY "Allow company access on univ_trainingrecords" ON public.univ_trainingrecords FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_triage" ON public.univ_triage;
CREATE POLICY "Allow company access on univ_triage" ON public.univ_triage FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_utilitybills" ON public.univ_utilitybills;
CREATE POLICY "Allow company access on univ_utilitybills" ON public.univ_utilitybills FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_vitalsigns" ON public.univ_vitalsigns;
CREATE POLICY "Allow company access on univ_vitalsigns" ON public.univ_vitalsigns FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_volunteerroster" ON public.univ_volunteerroster;
CREATE POLICY "Allow company access on univ_volunteerroster" ON public.univ_volunteerroster FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_vulnerabilities" ON public.univ_vulnerabilities;
CREATE POLICY "Allow company access on univ_vulnerabilities" ON public.univ_vulnerabilities FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_wishlists" ON public.univ_wishlists;
CREATE POLICY "Allow company access on univ_wishlists" ON public.univ_wishlists FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow company access on univ_workorders" ON public.univ_workorders;
CREATE POLICY "Allow company access on univ_workorders" ON public.univ_workorders FOR ALL USING (auth.uid() IS NOT NULL);

