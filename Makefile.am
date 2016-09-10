# Resources
resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/src --generate-dependencies $(srcdir)/src/com.endlessm.GrandCentral.src.gresource.xml)
app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/data --generate-dependencies $(srcdir)/data/com.endlessm.GrandCentral.data.gresource.xml)

resourcedir = $(pkgdatadir)
resource_DATA = data/com.endlessm.GrandCentral.data.gresource \
		src/com.endlessm.GrandCentral.src.gresource \
		$(NULL)

servicedir = $(datadir)/dbus-1/services
service_DATA = $(service_in_files:.service.in=.service)
service_in_files = \
	data/com.endlessm.GrandCentral.service.in \
        $(NULL)

# Set EXTRA_DIST and CLEANFILES initially
EXTRA_DIST = \
	$(resource_files) \
	$(service_in_files) \
	$(app_resource_files) \
	src/com.endlessm.GrandCentral.in \
	src/com.endlessm.GrandCentral.src.gresource.xml \
	data/com.endlessm.GrandCentral.data.gresource.xml \
	$(NULL)

data/com.endlessm.GrandCentral.service: $(srcdir)/data/com.endlessm.GrandCentral.service.in
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) sed -e "s|\@bindir\@|$(bindir)|" $< > $@

data/com.endlessm.GrandCentral.data.gresource: $(srcdir)/data/com.endlessm.GrandCentral.data.gresource.xml $(app_resource_files)
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/data $<

src/com.endlessm.GrandCentral.src.gresource: $(srcdir)/src/com.endlessm.GrandCentral.src.gresource.xml $(resource_files)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/src $<

src/com.endlessm.GrandCentral: $(srcdir)/src/com.endlessm.GrandCentral.in $(manager_resources)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	chmod +x $@
	echo $(app_resource_files)

# Scripts to install
bin_SCRIPTS = src/com.endlessm.GrandCentral

# Distclean
CLEANFILES = \
	$(resource_DATA) \
	$(service_DATA) \
	src/com.endlessm.GrandCentral \
	$(NULL)

