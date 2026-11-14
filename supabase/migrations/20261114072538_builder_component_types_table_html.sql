alter table public.builder_page_components
  drop constraint if exists builder_page_components_component_type_check;

alter table public.builder_page_components
  add constraint builder_page_components_component_type_check
  check (component_type = any (array[
    'heading','text','image','button','container','columns','card','navbar','footer','table','html'
  ]::text[]));
